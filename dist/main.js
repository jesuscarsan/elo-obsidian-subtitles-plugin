/* eslint-disable */

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/Infrastructure/Presentation/Obsidian/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SubtitlesPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian16 = require("obsidian");

// src/Infrastructure/Presentation/Obsidian/settings.ts
var DEFAULT_SETTINGS = {
  openSubtitlesApiKey: "",
  openSubtitlesUsername: "",
  openSubtitlesPassword: ""
};

// src/Infrastructure/Presentation/Obsidian/SubtitlesSettingsView.ts
var import_obsidian = require("obsidian");
var SubtitlesSettingsView = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Elocuency Subtitles Settings" });
    containerEl.createEl("h3", { text: "OpenSubtitles" });
    new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Consumer Key from OpenSubtitles.com API.").addText((text) => {
      text.setPlaceholder("API Key").setValue(this.plugin.settings.openSubtitlesApiKey).onChange(async (value) => {
        this.plugin.settings.openSubtitlesApiKey = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
    });
    new import_obsidian.Setting(containerEl).setName("Username").setDesc("OpenSubtitles.com Username.").addText((text) => {
      text.setPlaceholder("Username").setValue(this.plugin.settings.openSubtitlesUsername).onChange(async (value) => {
        this.plugin.settings.openSubtitlesUsername = value.trim();
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Password").setDesc("OpenSubtitles.com Password.").addText((text) => {
      text.setPlaceholder("Password").setValue(this.plugin.settings.openSubtitlesPassword).onChange(async (value) => {
        this.plugin.settings.openSubtitlesPassword = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
    });
  }
};

// src/Infrastructure/Adapters/OpenSubtitles/OpenSubtitlesAdapter.ts
var import_obsidian2 = require("obsidian");
var OpenSubtitlesAdapter = class {
  constructor(settings) {
    this.settings = settings;
    this.baseUrl = "https://api.opensubtitles.com/api/v1";
    this.token = null;
  }
  async login() {
    if (!this.settings.apiKey || !this.settings.username || !this.settings.password) {
      throw new Error("OpenSubtitles credentials are missing in settings.");
    }
    const response = await (0, import_obsidian2.requestUrl)({
      url: `${this.baseUrl}/login`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.settings.apiKey
      },
      body: JSON.stringify({
        username: this.settings.username,
        password: this.settings.password
      })
    });
    if (response.status !== 200) {
      throw new Error(`OpenSubtitles Login Failed: ${response.text}`);
    }
    this.token = response.json.token;
  }
  async getAuthHeaders() {
    if (!this.token) {
      await this.login();
    }
    return {
      "Content-Type": "application/json",
      "Api-Key": this.settings.apiKey,
      Authorization: `Bearer ${this.token}`
    };
  }
  async search(query, season, episode) {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      query,
      season_number: season.toString(),
      episode_number: episode.toString(),
      languages: "en"
    });
    const url = `${this.baseUrl}/subtitles?${params.toString()}`;
    const response = await (0, import_obsidian2.requestUrl)({
      url,
      method: "GET",
      headers
    });
    if (response.status !== 200) {
      console.error("OpenSubtitles Search Failed", response);
      return [];
    }
    return response.json.data || [];
  }
  async download(fileId) {
    const headers = await this.getAuthHeaders();
    const response = await (0, import_obsidian2.requestUrl)({
      url: `${this.baseUrl}/download`,
      method: "POST",
      headers,
      body: JSON.stringify({
        file_id: fileId
      })
    });
    if (response.status !== 200) {
      throw new Error(`OpenSubtitles Download Step 1 Failed: ${response.text}`);
    }
    const downloadUrl = response.json.link;
    const fileResponse = await (0, import_obsidian2.requestUrl)({
      url: downloadUrl,
      method: "GET"
    });
    return fileResponse.text;
  }
};

// src/Application/UseCases/DownloadSubtitlesUseCase.ts
var DownloadSubtitlesUseCase = class {
  constructor(subtitlesPort, noteRepository, editor, notification) {
    this.subtitlesPort = subtitlesPort;
    this.noteRepository = noteRepository;
    this.editor = editor;
    this.notification = notification;
  }
  async execute() {
    const activeFilePath = this.editor.getNotePath();
    if (!activeFilePath) {
      this.notification.showMessage("No active file found.");
      return;
    }
    const metadata = await this.noteRepository.getNoteMetadata(activeFilePath);
    const frontmatter = metadata == null ? void 0 : metadata.frontmatter;
    if (!frontmatter) {
      this.notification.showMessage("No frontmatter found.");
      return;
    }
    const serie = frontmatter["Serie"];
    const season = frontmatter["Temporada"];
    const episode = frontmatter["Capitulo"];
    if (!serie || !season || !episode) {
      this.notification.showMessage("Missing Serie, Temporada, or Capitulo fields.");
      return;
    }
    this.notification.showMessage(`Searching subtitles for ${serie} S${season}E${episode}...`);
    try {
      const results = await this.subtitlesPort.search(serie, Number(season), Number(episode));
      if (results.length === 0) {
        this.notification.showMessage("No subtitles found.");
        return;
      }
      const bestMatch = results[0];
      if (!bestMatch.attributes.files || bestMatch.attributes.files.length === 0) {
        this.notification.showMessage("Subtitle entry has no files.");
        return;
      }
      const fileId = bestMatch.attributes.files[0].file_id;
      this.notification.showMessage("Downloading subtitle...");
      const subtitleContent = await this.subtitlesPort.download(fileId);
      const currentContent = await this.editor.getValue();
      const newContent = currentContent + "\n\n## Subtitles\n\n" + subtitleContent;
      await this.editor.setValue(newContent);
      this.notification.showMessage("Subtitles downloaded and appended.");
    } catch (error) {
      console.error(error);
      this.notification.showMessage("Error downloading subtitles. Check console.");
    }
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianNoteRepository.ts
var import_obsidian3 = require("obsidian");
var ObsidianNoteRepository = class {
  constructor(app) {
    this.app = app;
  }
  async getNoteMetadata(path2) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (!(file instanceof import_obsidian3.TFile))
      return null;
    const cache = this.app.metadataCache.getFileCache(file);
    return {
      path: file.path,
      basename: file.basename,
      frontmatter: cache == null ? void 0 : cache.frontmatter,
      tags: cache ? (0, import_obsidian3.getAllTags)(cache) || void 0 : void 0
    };
  }
  async readNote(path2) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path2}`);
    return await this.app.vault.read(file);
  }
  async appendContent(path2, content) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path2}`);
    const currentContent = await this.app.vault.read(file);
    await this.app.vault.modify(file, currentContent + content);
  }
  async updateFrontmatter(path2, callback) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path2}`);
    await this.app.fileManager.processFrontMatter(file, callback);
  }
  async createNote(path2, content) {
    const file = await this.app.vault.create(path2, content);
    return {
      path: file.path,
      basename: file.basename,
      frontmatter: {},
      tags: []
    };
  }
  async exists(path2) {
    return await this.app.vault.adapter.exists(path2);
  }
  async createFolder(path2) {
    if (!await this.exists(path2)) {
      await this.app.vault.createFolder(path2);
    }
  }
  async getTemplateContent(path2) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (file instanceof import_obsidian3.TFile) {
      return await this.app.vault.read(file);
    }
    return null;
  }
  async writeNote(path2, content) {
    const file = this.app.vault.getAbstractFileByPath(path2);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path2}`);
    await this.app.vault.modify(file, content);
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianCommandExecutorAdapter.ts
var import_obsidian4 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianEditorAdapter.ts
var ObsidianEditorAdapter = class {
  constructor(view) {
    this.view = view;
  }
  get editor() {
    return this.view.editor;
  }
  getSelectedText() {
    return this.editor.getSelection();
  }
  replaceSelection(text) {
    this.editor.replaceSelection(text);
  }
  getCursorPosition() {
    return this.editor.getCursor();
  }
  setCursorPosition(line, ch) {
    this.editor.setCursor({ line, ch });
  }
  getValue() {
    return this.editor.getValue();
  }
  setValue(content) {
    this.editor.setValue(content);
  }
  insertAtCursor(text) {
    const cursor = this.getCursorPosition();
    this.editor.replaceRange(text, cursor);
  }
  getNoteTitle() {
    var _a2;
    return ((_a2 = this.view.file) == null ? void 0 : _a2.basename) || "";
  }
  getNotePath() {
    var _a2;
    return ((_a2 = this.view.file) == null ? void 0 : _a2.path) || "";
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianFileSystemAdapter.ts
var import_obsidian5 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianMetadataAdapter.ts
var import_obsidian6 = require("obsidian");

// ../../node_modules/.pnpm/@google+genai@1.39.0/node_modules/@google/genai/dist/web/index.mjs
var Outcome;
(function(Outcome2) {
  Outcome2["OUTCOME_UNSPECIFIED"] = "OUTCOME_UNSPECIFIED";
  Outcome2["OUTCOME_OK"] = "OUTCOME_OK";
  Outcome2["OUTCOME_FAILED"] = "OUTCOME_FAILED";
  Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "OUTCOME_DEADLINE_EXCEEDED";
})(Outcome || (Outcome = {}));
var Language;
(function(Language2) {
  Language2["LANGUAGE_UNSPECIFIED"] = "LANGUAGE_UNSPECIFIED";
  Language2["PYTHON"] = "PYTHON";
})(Language || (Language = {}));
var FunctionResponseScheduling;
(function(FunctionResponseScheduling2) {
  FunctionResponseScheduling2["SCHEDULING_UNSPECIFIED"] = "SCHEDULING_UNSPECIFIED";
  FunctionResponseScheduling2["SILENT"] = "SILENT";
  FunctionResponseScheduling2["WHEN_IDLE"] = "WHEN_IDLE";
  FunctionResponseScheduling2["INTERRUPT"] = "INTERRUPT";
})(FunctionResponseScheduling || (FunctionResponseScheduling = {}));
var Type;
(function(Type2) {
  Type2["TYPE_UNSPECIFIED"] = "TYPE_UNSPECIFIED";
  Type2["STRING"] = "STRING";
  Type2["NUMBER"] = "NUMBER";
  Type2["INTEGER"] = "INTEGER";
  Type2["BOOLEAN"] = "BOOLEAN";
  Type2["ARRAY"] = "ARRAY";
  Type2["OBJECT"] = "OBJECT";
  Type2["NULL"] = "NULL";
})(Type || (Type = {}));
var ApiSpec;
(function(ApiSpec2) {
  ApiSpec2["API_SPEC_UNSPECIFIED"] = "API_SPEC_UNSPECIFIED";
  ApiSpec2["SIMPLE_SEARCH"] = "SIMPLE_SEARCH";
  ApiSpec2["ELASTIC_SEARCH"] = "ELASTIC_SEARCH";
})(ApiSpec || (ApiSpec = {}));
var AuthType;
(function(AuthType2) {
  AuthType2["AUTH_TYPE_UNSPECIFIED"] = "AUTH_TYPE_UNSPECIFIED";
  AuthType2["NO_AUTH"] = "NO_AUTH";
  AuthType2["API_KEY_AUTH"] = "API_KEY_AUTH";
  AuthType2["HTTP_BASIC_AUTH"] = "HTTP_BASIC_AUTH";
  AuthType2["GOOGLE_SERVICE_ACCOUNT_AUTH"] = "GOOGLE_SERVICE_ACCOUNT_AUTH";
  AuthType2["OAUTH"] = "OAUTH";
  AuthType2["OIDC_AUTH"] = "OIDC_AUTH";
})(AuthType || (AuthType = {}));
var HttpElementLocation;
(function(HttpElementLocation2) {
  HttpElementLocation2["HTTP_IN_UNSPECIFIED"] = "HTTP_IN_UNSPECIFIED";
  HttpElementLocation2["HTTP_IN_QUERY"] = "HTTP_IN_QUERY";
  HttpElementLocation2["HTTP_IN_HEADER"] = "HTTP_IN_HEADER";
  HttpElementLocation2["HTTP_IN_PATH"] = "HTTP_IN_PATH";
  HttpElementLocation2["HTTP_IN_BODY"] = "HTTP_IN_BODY";
  HttpElementLocation2["HTTP_IN_COOKIE"] = "HTTP_IN_COOKIE";
})(HttpElementLocation || (HttpElementLocation = {}));
var PhishBlockThreshold;
(function(PhishBlockThreshold2) {
  PhishBlockThreshold2["PHISH_BLOCK_THRESHOLD_UNSPECIFIED"] = "PHISH_BLOCK_THRESHOLD_UNSPECIFIED";
  PhishBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  PhishBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  PhishBlockThreshold2["BLOCK_HIGH_AND_ABOVE"] = "BLOCK_HIGH_AND_ABOVE";
  PhishBlockThreshold2["BLOCK_HIGHER_AND_ABOVE"] = "BLOCK_HIGHER_AND_ABOVE";
  PhishBlockThreshold2["BLOCK_VERY_HIGH_AND_ABOVE"] = "BLOCK_VERY_HIGH_AND_ABOVE";
  PhishBlockThreshold2["BLOCK_ONLY_EXTREMELY_HIGH"] = "BLOCK_ONLY_EXTREMELY_HIGH";
})(PhishBlockThreshold || (PhishBlockThreshold = {}));
var Behavior;
(function(Behavior2) {
  Behavior2["UNSPECIFIED"] = "UNSPECIFIED";
  Behavior2["BLOCKING"] = "BLOCKING";
  Behavior2["NON_BLOCKING"] = "NON_BLOCKING";
})(Behavior || (Behavior = {}));
var DynamicRetrievalConfigMode;
(function(DynamicRetrievalConfigMode2) {
  DynamicRetrievalConfigMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  DynamicRetrievalConfigMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalConfigMode || (DynamicRetrievalConfigMode = {}));
var FunctionCallingConfigMode;
(function(FunctionCallingConfigMode2) {
  FunctionCallingConfigMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  FunctionCallingConfigMode2["AUTO"] = "AUTO";
  FunctionCallingConfigMode2["ANY"] = "ANY";
  FunctionCallingConfigMode2["NONE"] = "NONE";
  FunctionCallingConfigMode2["VALIDATED"] = "VALIDATED";
})(FunctionCallingConfigMode || (FunctionCallingConfigMode = {}));
var ThinkingLevel;
(function(ThinkingLevel2) {
  ThinkingLevel2["THINKING_LEVEL_UNSPECIFIED"] = "THINKING_LEVEL_UNSPECIFIED";
  ThinkingLevel2["LOW"] = "LOW";
  ThinkingLevel2["MEDIUM"] = "MEDIUM";
  ThinkingLevel2["HIGH"] = "HIGH";
  ThinkingLevel2["MINIMAL"] = "MINIMAL";
})(ThinkingLevel || (ThinkingLevel = {}));
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
  HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
  HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
  HarmCategory2["HARM_CATEGORY_IMAGE_HATE"] = "HARM_CATEGORY_IMAGE_HATE";
  HarmCategory2["HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT"] = "HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT";
  HarmCategory2["HARM_CATEGORY_IMAGE_HARASSMENT"] = "HARM_CATEGORY_IMAGE_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_JAILBREAK"] = "HARM_CATEGORY_JAILBREAK";
})(HarmCategory || (HarmCategory = {}));
var HarmBlockMethod;
(function(HarmBlockMethod2) {
  HarmBlockMethod2["HARM_BLOCK_METHOD_UNSPECIFIED"] = "HARM_BLOCK_METHOD_UNSPECIFIED";
  HarmBlockMethod2["SEVERITY"] = "SEVERITY";
  HarmBlockMethod2["PROBABILITY"] = "PROBABILITY";
})(HarmBlockMethod || (HarmBlockMethod = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
  HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
  HarmBlockThreshold2["OFF"] = "OFF";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
  FinishReason2["STOP"] = "STOP";
  FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
  FinishReason2["SAFETY"] = "SAFETY";
  FinishReason2["RECITATION"] = "RECITATION";
  FinishReason2["LANGUAGE"] = "LANGUAGE";
  FinishReason2["OTHER"] = "OTHER";
  FinishReason2["BLOCKLIST"] = "BLOCKLIST";
  FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
  FinishReason2["SPII"] = "SPII";
  FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
  FinishReason2["IMAGE_SAFETY"] = "IMAGE_SAFETY";
  FinishReason2["UNEXPECTED_TOOL_CALL"] = "UNEXPECTED_TOOL_CALL";
  FinishReason2["IMAGE_PROHIBITED_CONTENT"] = "IMAGE_PROHIBITED_CONTENT";
  FinishReason2["NO_IMAGE"] = "NO_IMAGE";
  FinishReason2["IMAGE_RECITATION"] = "IMAGE_RECITATION";
  FinishReason2["IMAGE_OTHER"] = "IMAGE_OTHER";
})(FinishReason || (FinishReason = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
  HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
  HarmProbability2["LOW"] = "LOW";
  HarmProbability2["MEDIUM"] = "MEDIUM";
  HarmProbability2["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var HarmSeverity;
(function(HarmSeverity2) {
  HarmSeverity2["HARM_SEVERITY_UNSPECIFIED"] = "HARM_SEVERITY_UNSPECIFIED";
  HarmSeverity2["HARM_SEVERITY_NEGLIGIBLE"] = "HARM_SEVERITY_NEGLIGIBLE";
  HarmSeverity2["HARM_SEVERITY_LOW"] = "HARM_SEVERITY_LOW";
  HarmSeverity2["HARM_SEVERITY_MEDIUM"] = "HARM_SEVERITY_MEDIUM";
  HarmSeverity2["HARM_SEVERITY_HIGH"] = "HARM_SEVERITY_HIGH";
})(HarmSeverity || (HarmSeverity = {}));
var UrlRetrievalStatus;
(function(UrlRetrievalStatus2) {
  UrlRetrievalStatus2["URL_RETRIEVAL_STATUS_UNSPECIFIED"] = "URL_RETRIEVAL_STATUS_UNSPECIFIED";
  UrlRetrievalStatus2["URL_RETRIEVAL_STATUS_SUCCESS"] = "URL_RETRIEVAL_STATUS_SUCCESS";
  UrlRetrievalStatus2["URL_RETRIEVAL_STATUS_ERROR"] = "URL_RETRIEVAL_STATUS_ERROR";
  UrlRetrievalStatus2["URL_RETRIEVAL_STATUS_PAYWALL"] = "URL_RETRIEVAL_STATUS_PAYWALL";
  UrlRetrievalStatus2["URL_RETRIEVAL_STATUS_UNSAFE"] = "URL_RETRIEVAL_STATUS_UNSAFE";
})(UrlRetrievalStatus || (UrlRetrievalStatus = {}));
var BlockedReason;
(function(BlockedReason2) {
  BlockedReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
  BlockedReason2["SAFETY"] = "SAFETY";
  BlockedReason2["OTHER"] = "OTHER";
  BlockedReason2["BLOCKLIST"] = "BLOCKLIST";
  BlockedReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
  BlockedReason2["IMAGE_SAFETY"] = "IMAGE_SAFETY";
  BlockedReason2["MODEL_ARMOR"] = "MODEL_ARMOR";
  BlockedReason2["JAILBREAK"] = "JAILBREAK";
})(BlockedReason || (BlockedReason = {}));
var TrafficType;
(function(TrafficType2) {
  TrafficType2["TRAFFIC_TYPE_UNSPECIFIED"] = "TRAFFIC_TYPE_UNSPECIFIED";
  TrafficType2["ON_DEMAND"] = "ON_DEMAND";
  TrafficType2["PROVISIONED_THROUGHPUT"] = "PROVISIONED_THROUGHPUT";
})(TrafficType || (TrafficType = {}));
var Modality;
(function(Modality2) {
  Modality2["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
  Modality2["TEXT"] = "TEXT";
  Modality2["IMAGE"] = "IMAGE";
  Modality2["AUDIO"] = "AUDIO";
})(Modality || (Modality = {}));
var MediaResolution;
(function(MediaResolution2) {
  MediaResolution2["MEDIA_RESOLUTION_UNSPECIFIED"] = "MEDIA_RESOLUTION_UNSPECIFIED";
  MediaResolution2["MEDIA_RESOLUTION_LOW"] = "MEDIA_RESOLUTION_LOW";
  MediaResolution2["MEDIA_RESOLUTION_MEDIUM"] = "MEDIA_RESOLUTION_MEDIUM";
  MediaResolution2["MEDIA_RESOLUTION_HIGH"] = "MEDIA_RESOLUTION_HIGH";
})(MediaResolution || (MediaResolution = {}));
var TuningMode;
(function(TuningMode2) {
  TuningMode2["TUNING_MODE_UNSPECIFIED"] = "TUNING_MODE_UNSPECIFIED";
  TuningMode2["TUNING_MODE_FULL"] = "TUNING_MODE_FULL";
  TuningMode2["TUNING_MODE_PEFT_ADAPTER"] = "TUNING_MODE_PEFT_ADAPTER";
})(TuningMode || (TuningMode = {}));
var AdapterSize;
(function(AdapterSize2) {
  AdapterSize2["ADAPTER_SIZE_UNSPECIFIED"] = "ADAPTER_SIZE_UNSPECIFIED";
  AdapterSize2["ADAPTER_SIZE_ONE"] = "ADAPTER_SIZE_ONE";
  AdapterSize2["ADAPTER_SIZE_TWO"] = "ADAPTER_SIZE_TWO";
  AdapterSize2["ADAPTER_SIZE_FOUR"] = "ADAPTER_SIZE_FOUR";
  AdapterSize2["ADAPTER_SIZE_EIGHT"] = "ADAPTER_SIZE_EIGHT";
  AdapterSize2["ADAPTER_SIZE_SIXTEEN"] = "ADAPTER_SIZE_SIXTEEN";
  AdapterSize2["ADAPTER_SIZE_THIRTY_TWO"] = "ADAPTER_SIZE_THIRTY_TWO";
})(AdapterSize || (AdapterSize = {}));
var JobState;
(function(JobState2) {
  JobState2["JOB_STATE_UNSPECIFIED"] = "JOB_STATE_UNSPECIFIED";
  JobState2["JOB_STATE_QUEUED"] = "JOB_STATE_QUEUED";
  JobState2["JOB_STATE_PENDING"] = "JOB_STATE_PENDING";
  JobState2["JOB_STATE_RUNNING"] = "JOB_STATE_RUNNING";
  JobState2["JOB_STATE_SUCCEEDED"] = "JOB_STATE_SUCCEEDED";
  JobState2["JOB_STATE_FAILED"] = "JOB_STATE_FAILED";
  JobState2["JOB_STATE_CANCELLING"] = "JOB_STATE_CANCELLING";
  JobState2["JOB_STATE_CANCELLED"] = "JOB_STATE_CANCELLED";
  JobState2["JOB_STATE_PAUSED"] = "JOB_STATE_PAUSED";
  JobState2["JOB_STATE_EXPIRED"] = "JOB_STATE_EXPIRED";
  JobState2["JOB_STATE_UPDATING"] = "JOB_STATE_UPDATING";
  JobState2["JOB_STATE_PARTIALLY_SUCCEEDED"] = "JOB_STATE_PARTIALLY_SUCCEEDED";
})(JobState || (JobState = {}));
var TuningTask;
(function(TuningTask2) {
  TuningTask2["TUNING_TASK_UNSPECIFIED"] = "TUNING_TASK_UNSPECIFIED";
  TuningTask2["TUNING_TASK_I2V"] = "TUNING_TASK_I2V";
  TuningTask2["TUNING_TASK_T2V"] = "TUNING_TASK_T2V";
  TuningTask2["TUNING_TASK_R2V"] = "TUNING_TASK_R2V";
})(TuningTask || (TuningTask = {}));
var PartMediaResolutionLevel;
(function(PartMediaResolutionLevel2) {
  PartMediaResolutionLevel2["MEDIA_RESOLUTION_UNSPECIFIED"] = "MEDIA_RESOLUTION_UNSPECIFIED";
  PartMediaResolutionLevel2["MEDIA_RESOLUTION_LOW"] = "MEDIA_RESOLUTION_LOW";
  PartMediaResolutionLevel2["MEDIA_RESOLUTION_MEDIUM"] = "MEDIA_RESOLUTION_MEDIUM";
  PartMediaResolutionLevel2["MEDIA_RESOLUTION_HIGH"] = "MEDIA_RESOLUTION_HIGH";
  PartMediaResolutionLevel2["MEDIA_RESOLUTION_ULTRA_HIGH"] = "MEDIA_RESOLUTION_ULTRA_HIGH";
})(PartMediaResolutionLevel || (PartMediaResolutionLevel = {}));
var ResourceScope;
(function(ResourceScope2) {
  ResourceScope2["COLLECTION"] = "COLLECTION";
})(ResourceScope || (ResourceScope = {}));
var FeatureSelectionPreference;
(function(FeatureSelectionPreference2) {
  FeatureSelectionPreference2["FEATURE_SELECTION_PREFERENCE_UNSPECIFIED"] = "FEATURE_SELECTION_PREFERENCE_UNSPECIFIED";
  FeatureSelectionPreference2["PRIORITIZE_QUALITY"] = "PRIORITIZE_QUALITY";
  FeatureSelectionPreference2["BALANCED"] = "BALANCED";
  FeatureSelectionPreference2["PRIORITIZE_COST"] = "PRIORITIZE_COST";
})(FeatureSelectionPreference || (FeatureSelectionPreference = {}));
var Environment;
(function(Environment2) {
  Environment2["ENVIRONMENT_UNSPECIFIED"] = "ENVIRONMENT_UNSPECIFIED";
  Environment2["ENVIRONMENT_BROWSER"] = "ENVIRONMENT_BROWSER";
})(Environment || (Environment = {}));
var SafetyFilterLevel;
(function(SafetyFilterLevel2) {
  SafetyFilterLevel2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  SafetyFilterLevel2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  SafetyFilterLevel2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  SafetyFilterLevel2["BLOCK_NONE"] = "BLOCK_NONE";
})(SafetyFilterLevel || (SafetyFilterLevel = {}));
var PersonGeneration;
(function(PersonGeneration2) {
  PersonGeneration2["DONT_ALLOW"] = "DONT_ALLOW";
  PersonGeneration2["ALLOW_ADULT"] = "ALLOW_ADULT";
  PersonGeneration2["ALLOW_ALL"] = "ALLOW_ALL";
})(PersonGeneration || (PersonGeneration = {}));
var ImagePromptLanguage;
(function(ImagePromptLanguage2) {
  ImagePromptLanguage2["auto"] = "auto";
  ImagePromptLanguage2["en"] = "en";
  ImagePromptLanguage2["ja"] = "ja";
  ImagePromptLanguage2["ko"] = "ko";
  ImagePromptLanguage2["hi"] = "hi";
  ImagePromptLanguage2["zh"] = "zh";
  ImagePromptLanguage2["pt"] = "pt";
  ImagePromptLanguage2["es"] = "es";
})(ImagePromptLanguage || (ImagePromptLanguage = {}));
var MaskReferenceMode;
(function(MaskReferenceMode2) {
  MaskReferenceMode2["MASK_MODE_DEFAULT"] = "MASK_MODE_DEFAULT";
  MaskReferenceMode2["MASK_MODE_USER_PROVIDED"] = "MASK_MODE_USER_PROVIDED";
  MaskReferenceMode2["MASK_MODE_BACKGROUND"] = "MASK_MODE_BACKGROUND";
  MaskReferenceMode2["MASK_MODE_FOREGROUND"] = "MASK_MODE_FOREGROUND";
  MaskReferenceMode2["MASK_MODE_SEMANTIC"] = "MASK_MODE_SEMANTIC";
})(MaskReferenceMode || (MaskReferenceMode = {}));
var ControlReferenceType;
(function(ControlReferenceType2) {
  ControlReferenceType2["CONTROL_TYPE_DEFAULT"] = "CONTROL_TYPE_DEFAULT";
  ControlReferenceType2["CONTROL_TYPE_CANNY"] = "CONTROL_TYPE_CANNY";
  ControlReferenceType2["CONTROL_TYPE_SCRIBBLE"] = "CONTROL_TYPE_SCRIBBLE";
  ControlReferenceType2["CONTROL_TYPE_FACE_MESH"] = "CONTROL_TYPE_FACE_MESH";
})(ControlReferenceType || (ControlReferenceType = {}));
var SubjectReferenceType;
(function(SubjectReferenceType2) {
  SubjectReferenceType2["SUBJECT_TYPE_DEFAULT"] = "SUBJECT_TYPE_DEFAULT";
  SubjectReferenceType2["SUBJECT_TYPE_PERSON"] = "SUBJECT_TYPE_PERSON";
  SubjectReferenceType2["SUBJECT_TYPE_ANIMAL"] = "SUBJECT_TYPE_ANIMAL";
  SubjectReferenceType2["SUBJECT_TYPE_PRODUCT"] = "SUBJECT_TYPE_PRODUCT";
})(SubjectReferenceType || (SubjectReferenceType = {}));
var EditMode;
(function(EditMode2) {
  EditMode2["EDIT_MODE_DEFAULT"] = "EDIT_MODE_DEFAULT";
  EditMode2["EDIT_MODE_INPAINT_REMOVAL"] = "EDIT_MODE_INPAINT_REMOVAL";
  EditMode2["EDIT_MODE_INPAINT_INSERTION"] = "EDIT_MODE_INPAINT_INSERTION";
  EditMode2["EDIT_MODE_OUTPAINT"] = "EDIT_MODE_OUTPAINT";
  EditMode2["EDIT_MODE_CONTROLLED_EDITING"] = "EDIT_MODE_CONTROLLED_EDITING";
  EditMode2["EDIT_MODE_STYLE"] = "EDIT_MODE_STYLE";
  EditMode2["EDIT_MODE_BGSWAP"] = "EDIT_MODE_BGSWAP";
  EditMode2["EDIT_MODE_PRODUCT_IMAGE"] = "EDIT_MODE_PRODUCT_IMAGE";
})(EditMode || (EditMode = {}));
var SegmentMode;
(function(SegmentMode2) {
  SegmentMode2["FOREGROUND"] = "FOREGROUND";
  SegmentMode2["BACKGROUND"] = "BACKGROUND";
  SegmentMode2["PROMPT"] = "PROMPT";
  SegmentMode2["SEMANTIC"] = "SEMANTIC";
  SegmentMode2["INTERACTIVE"] = "INTERACTIVE";
})(SegmentMode || (SegmentMode = {}));
var VideoGenerationReferenceType;
(function(VideoGenerationReferenceType2) {
  VideoGenerationReferenceType2["ASSET"] = "ASSET";
  VideoGenerationReferenceType2["STYLE"] = "STYLE";
})(VideoGenerationReferenceType || (VideoGenerationReferenceType = {}));
var VideoGenerationMaskMode;
(function(VideoGenerationMaskMode2) {
  VideoGenerationMaskMode2["INSERT"] = "INSERT";
  VideoGenerationMaskMode2["REMOVE"] = "REMOVE";
  VideoGenerationMaskMode2["REMOVE_STATIC"] = "REMOVE_STATIC";
  VideoGenerationMaskMode2["OUTPAINT"] = "OUTPAINT";
})(VideoGenerationMaskMode || (VideoGenerationMaskMode = {}));
var VideoCompressionQuality;
(function(VideoCompressionQuality2) {
  VideoCompressionQuality2["OPTIMIZED"] = "OPTIMIZED";
  VideoCompressionQuality2["LOSSLESS"] = "LOSSLESS";
})(VideoCompressionQuality || (VideoCompressionQuality = {}));
var TuningMethod;
(function(TuningMethod2) {
  TuningMethod2["SUPERVISED_FINE_TUNING"] = "SUPERVISED_FINE_TUNING";
  TuningMethod2["PREFERENCE_TUNING"] = "PREFERENCE_TUNING";
  TuningMethod2["DISTILLATION"] = "DISTILLATION";
})(TuningMethod || (TuningMethod = {}));
var DocumentState;
(function(DocumentState2) {
  DocumentState2["STATE_UNSPECIFIED"] = "STATE_UNSPECIFIED";
  DocumentState2["STATE_PENDING"] = "STATE_PENDING";
  DocumentState2["STATE_ACTIVE"] = "STATE_ACTIVE";
  DocumentState2["STATE_FAILED"] = "STATE_FAILED";
})(DocumentState || (DocumentState = {}));
var FileState;
(function(FileState2) {
  FileState2["STATE_UNSPECIFIED"] = "STATE_UNSPECIFIED";
  FileState2["PROCESSING"] = "PROCESSING";
  FileState2["ACTIVE"] = "ACTIVE";
  FileState2["FAILED"] = "FAILED";
})(FileState || (FileState = {}));
var FileSource;
(function(FileSource2) {
  FileSource2["SOURCE_UNSPECIFIED"] = "SOURCE_UNSPECIFIED";
  FileSource2["UPLOADED"] = "UPLOADED";
  FileSource2["GENERATED"] = "GENERATED";
  FileSource2["REGISTERED"] = "REGISTERED";
})(FileSource || (FileSource = {}));
var TurnCompleteReason;
(function(TurnCompleteReason2) {
  TurnCompleteReason2["TURN_COMPLETE_REASON_UNSPECIFIED"] = "TURN_COMPLETE_REASON_UNSPECIFIED";
  TurnCompleteReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
  TurnCompleteReason2["RESPONSE_REJECTED"] = "RESPONSE_REJECTED";
  TurnCompleteReason2["NEED_MORE_INPUT"] = "NEED_MORE_INPUT";
})(TurnCompleteReason || (TurnCompleteReason = {}));
var MediaModality;
(function(MediaModality2) {
  MediaModality2["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
  MediaModality2["TEXT"] = "TEXT";
  MediaModality2["IMAGE"] = "IMAGE";
  MediaModality2["VIDEO"] = "VIDEO";
  MediaModality2["AUDIO"] = "AUDIO";
  MediaModality2["DOCUMENT"] = "DOCUMENT";
})(MediaModality || (MediaModality = {}));
var VadSignalType;
(function(VadSignalType2) {
  VadSignalType2["VAD_SIGNAL_TYPE_UNSPECIFIED"] = "VAD_SIGNAL_TYPE_UNSPECIFIED";
  VadSignalType2["VAD_SIGNAL_TYPE_SOS"] = "VAD_SIGNAL_TYPE_SOS";
  VadSignalType2["VAD_SIGNAL_TYPE_EOS"] = "VAD_SIGNAL_TYPE_EOS";
})(VadSignalType || (VadSignalType = {}));
var VoiceActivityType;
(function(VoiceActivityType2) {
  VoiceActivityType2["TYPE_UNSPECIFIED"] = "TYPE_UNSPECIFIED";
  VoiceActivityType2["ACTIVITY_START"] = "ACTIVITY_START";
  VoiceActivityType2["ACTIVITY_END"] = "ACTIVITY_END";
})(VoiceActivityType || (VoiceActivityType = {}));
var StartSensitivity;
(function(StartSensitivity2) {
  StartSensitivity2["START_SENSITIVITY_UNSPECIFIED"] = "START_SENSITIVITY_UNSPECIFIED";
  StartSensitivity2["START_SENSITIVITY_HIGH"] = "START_SENSITIVITY_HIGH";
  StartSensitivity2["START_SENSITIVITY_LOW"] = "START_SENSITIVITY_LOW";
})(StartSensitivity || (StartSensitivity = {}));
var EndSensitivity;
(function(EndSensitivity2) {
  EndSensitivity2["END_SENSITIVITY_UNSPECIFIED"] = "END_SENSITIVITY_UNSPECIFIED";
  EndSensitivity2["END_SENSITIVITY_HIGH"] = "END_SENSITIVITY_HIGH";
  EndSensitivity2["END_SENSITIVITY_LOW"] = "END_SENSITIVITY_LOW";
})(EndSensitivity || (EndSensitivity = {}));
var ActivityHandling;
(function(ActivityHandling2) {
  ActivityHandling2["ACTIVITY_HANDLING_UNSPECIFIED"] = "ACTIVITY_HANDLING_UNSPECIFIED";
  ActivityHandling2["START_OF_ACTIVITY_INTERRUPTS"] = "START_OF_ACTIVITY_INTERRUPTS";
  ActivityHandling2["NO_INTERRUPTION"] = "NO_INTERRUPTION";
})(ActivityHandling || (ActivityHandling = {}));
var TurnCoverage;
(function(TurnCoverage2) {
  TurnCoverage2["TURN_COVERAGE_UNSPECIFIED"] = "TURN_COVERAGE_UNSPECIFIED";
  TurnCoverage2["TURN_INCLUDES_ONLY_ACTIVITY"] = "TURN_INCLUDES_ONLY_ACTIVITY";
  TurnCoverage2["TURN_INCLUDES_ALL_INPUT"] = "TURN_INCLUDES_ALL_INPUT";
})(TurnCoverage || (TurnCoverage = {}));
var Scale;
(function(Scale2) {
  Scale2["SCALE_UNSPECIFIED"] = "SCALE_UNSPECIFIED";
  Scale2["C_MAJOR_A_MINOR"] = "C_MAJOR_A_MINOR";
  Scale2["D_FLAT_MAJOR_B_FLAT_MINOR"] = "D_FLAT_MAJOR_B_FLAT_MINOR";
  Scale2["D_MAJOR_B_MINOR"] = "D_MAJOR_B_MINOR";
  Scale2["E_FLAT_MAJOR_C_MINOR"] = "E_FLAT_MAJOR_C_MINOR";
  Scale2["E_MAJOR_D_FLAT_MINOR"] = "E_MAJOR_D_FLAT_MINOR";
  Scale2["F_MAJOR_D_MINOR"] = "F_MAJOR_D_MINOR";
  Scale2["G_FLAT_MAJOR_E_FLAT_MINOR"] = "G_FLAT_MAJOR_E_FLAT_MINOR";
  Scale2["G_MAJOR_E_MINOR"] = "G_MAJOR_E_MINOR";
  Scale2["A_FLAT_MAJOR_F_MINOR"] = "A_FLAT_MAJOR_F_MINOR";
  Scale2["A_MAJOR_G_FLAT_MINOR"] = "A_MAJOR_G_FLAT_MINOR";
  Scale2["B_FLAT_MAJOR_G_MINOR"] = "B_FLAT_MAJOR_G_MINOR";
  Scale2["B_MAJOR_A_FLAT_MINOR"] = "B_MAJOR_A_FLAT_MINOR";
})(Scale || (Scale = {}));
var MusicGenerationMode;
(function(MusicGenerationMode2) {
  MusicGenerationMode2["MUSIC_GENERATION_MODE_UNSPECIFIED"] = "MUSIC_GENERATION_MODE_UNSPECIFIED";
  MusicGenerationMode2["QUALITY"] = "QUALITY";
  MusicGenerationMode2["DIVERSITY"] = "DIVERSITY";
  MusicGenerationMode2["VOCALIZATION"] = "VOCALIZATION";
})(MusicGenerationMode || (MusicGenerationMode = {}));
var LiveMusicPlaybackControl;
(function(LiveMusicPlaybackControl2) {
  LiveMusicPlaybackControl2["PLAYBACK_CONTROL_UNSPECIFIED"] = "PLAYBACK_CONTROL_UNSPECIFIED";
  LiveMusicPlaybackControl2["PLAY"] = "PLAY";
  LiveMusicPlaybackControl2["PAUSE"] = "PAUSE";
  LiveMusicPlaybackControl2["STOP"] = "STOP";
  LiveMusicPlaybackControl2["RESET_CONTEXT"] = "RESET_CONTEXT";
})(LiveMusicPlaybackControl || (LiveMusicPlaybackControl = {}));
var PagedItem;
(function(PagedItem2) {
  PagedItem2["PAGED_ITEM_BATCH_JOBS"] = "batchJobs";
  PagedItem2["PAGED_ITEM_MODELS"] = "models";
  PagedItem2["PAGED_ITEM_TUNING_JOBS"] = "tuningJobs";
  PagedItem2["PAGED_ITEM_FILES"] = "files";
  PagedItem2["PAGED_ITEM_CACHED_CONTENTS"] = "cachedContents";
  PagedItem2["PAGED_ITEM_FILE_SEARCH_STORES"] = "fileSearchStores";
  PagedItem2["PAGED_ITEM_DOCUMENTS"] = "documents";
})(PagedItem || (PagedItem = {}));
function __rest(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m)
    return m.call(o);
  if (o && typeof o.length === "number")
    return {
      next: function() {
        if (o && i >= o.length)
          o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f)
        i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length)
      resume(q[0][0], q[0][1]);
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
var SDK_VERSION = "1.39.0";
var LIBRARY_LABEL = `google-genai-sdk/${SDK_VERSION}`;
var uuid4Internal = function() {
  const { crypto } = globalThis;
  if (crypto === null || crypto === void 0 ? void 0 : crypto.randomUUID) {
    uuid4Internal = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};
var uuid4 = () => uuid4Internal();
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch (_a2) {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch (_b) {
    }
  }
  return new Error(err);
};
var GeminiNextGenAPIClientError = class extends Error {
};
var APIError = class _APIError extends GeminiNextGenAPIClientError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = (error === null || error === void 0 ? void 0 : error.message) ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message !== null && message !== void 0 ? message : "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArrayInternal = (val) => (isArrayInternal = Array.isArray, isArrayInternal(val));
var isArray = isArrayInternal;
var isReadonlyArrayInternal = isArray;
var isReadonlyArray = isReadonlyArrayInternal;
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new GeminiNextGenAPIClientError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new GeminiNextGenAPIClientError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};
var sleep$1 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var VERSION = "0.0.1";
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  var _a2, _b, _c, _d, _e;
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : (_b = (_a2 = Deno.version) === null || _a2 === void 0 ? void 0 : _a2.deno) !== null && _b !== void 0 ? _b : "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform((_c = globalThis.process.platform) !== null && _c !== void 0 ? _c : "unknown"),
      "X-Stainless-Arch": normalizeArch((_d = globalThis.process.arch) !== null && _d !== void 0 ? _d : "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": (_e = globalThis.process.version) !== null && _e !== void 0 ? _e : "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders !== null && _platformHeaders !== void 0 ? _platformHeaders : _platformHeaders = getPlatformProperties();
};
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new GeminiNextGenAPIClient({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      var _a2;
      await ((_a2 = iter.return) === null || _a2 === void 0 ? void 0 : _a2.call(iter));
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result === null || result === void 0 ? void 0 : result.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  var _a2, _b;
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await ((_b = (_a2 = stream[Symbol.asyncIterator]()).return) === null || _b === void 0 ? void 0 : _b.call(_a2));
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};
var checkFileSupport = () => {
  var _a2;
  if (typeof File === "undefined") {
    const { process } = globalThis;
    const isOldNode = typeof ((_a2 = process === null || process === void 0 ? void 0 : process.versions) === null || _a2 === void 0 ? void 0 : _a2.node) === "string" && parseInt(process.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName !== null && fileName !== void 0 ? fileName : "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (isFileLike(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  name || (name = getName(value));
  if (!(options === null || options === void 0 ? void 0 : options.type)) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = Object.assign(Object.assign({}, options), { type });
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  var _a2, e_1, _b, _c;
  var _d;
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    try {
      for (var _e = true, value_1 = __asyncValues(value), value_1_1; value_1_1 = await value_1.next(), _a2 = value_1_1.done, !_a2; _e = true) {
        _c = value_1_1.value;
        _e = false;
        const chunk = _c;
        parts.push(...await getBytes(chunk));
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (!_e && !_a2 && (_b = value_1.return))
          await _b.call(value_1);
      } finally {
        if (e_1)
          throw e_1.error;
      }
    }
  } else {
    const constructor = (_d = value === null || value === void 0 ? void 0 : value.constructor) === null || _d === void 0 ? void 0 : _d.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};
APIResource._key = [];
function encodeURIPath(str) {
  return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path2(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path3 = statics.reduce((previousValue, currentValue, index) => {
    var _a2, _b, _c;
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === ((_c = Object.getPrototypeOf((_b = Object.getPrototypeOf((_a2 = value.hasOwnProperty) !== null && _a2 !== void 0 ? _a2 : EMPTY)) !== null && _b !== void 0 ? _b : EMPTY)) === null || _c === void 0 ? void 0 : _c.toString))) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path3.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new GeminiNextGenAPIClientError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path3}
${underline}`);
  }
  return path3;
};
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);
var BaseInteractions = class extends APIResource {
  create(params, options) {
    var _a2;
    const { api_version = this._client.apiVersion } = params, body = __rest(params, ["api_version"]);
    if ("model" in body && "agent_config" in body) {
      throw new GeminiNextGenAPIClientError(`Invalid request: specified \`model\` and \`agent_config\`. If specifying \`model\`, use \`generation_config\`.`);
    }
    if ("agent" in body && "generation_config" in body) {
      throw new GeminiNextGenAPIClientError(`Invalid request: specified \`agent\` and \`generation_config\`. If specifying \`agent\`, use \`agent_config\`.`);
    }
    return this._client.post(path`/${api_version}/interactions`, Object.assign(Object.assign({ body }, options), { stream: (_a2 = params.stream) !== null && _a2 !== void 0 ? _a2 : false }));
  }
  /**
   * Deletes the interaction by id.
   *
   * @example
   * ```ts
   * const interaction = await client.interactions.delete('id', {
   *   api_version: 'api_version',
   * });
   * ```
   */
  delete(id, params = {}, options) {
    const { api_version = this._client.apiVersion } = params !== null && params !== void 0 ? params : {};
    return this._client.delete(path`/${api_version}/interactions/${id}`, options);
  }
  /**
   * Cancels an interaction by id. This only applies to background interactions that are still running.
   *
   * @example
   * ```ts
   * const interaction = await client.interactions.cancel('id', {
   *   api_version: 'api_version',
   * });
   * ```
   */
  cancel(id, params = {}, options) {
    const { api_version = this._client.apiVersion } = params !== null && params !== void 0 ? params : {};
    return this._client.post(path`/${api_version}/interactions/${id}/cancel`, options);
  }
  get(id, params = {}, options) {
    var _a2;
    const _b = params !== null && params !== void 0 ? params : {}, { api_version = this._client.apiVersion } = _b, query = __rest(_b, ["api_version"]);
    return this._client.get(path`/${api_version}/interactions/${id}`, Object.assign(Object.assign({ query }, options), { stream: (_a2 = params === null || params === void 0 ? void 0 : params.stream) !== null && _a2 !== void 0 ? _a2 : false }));
  }
};
BaseInteractions._key = Object.freeze(["interactions"]);
var Interactions = class extends BaseInteractions {
};
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str) {
  let encoder;
  return (encodeUTF8_ !== null && encodeUTF8_ !== void 0 ? encodeUTF8_ : (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ !== null && decodeUTF8_ !== void 0 ? decodeUTF8_ : (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}
var LineDecoder = class {
  constructor() {
    this.buffer = new Uint8Array();
    this.carriageReturnIndex = null;
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    this.buffer = concatBytes([this.buffer, binaryChunk]);
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(this.buffer, this.carriageReturnIndex)) != null) {
      if (patternIndex.carriage && this.carriageReturnIndex == null) {
        this.carriageReturnIndex = patternIndex.index;
        continue;
      }
      if (this.carriageReturnIndex != null && (patternIndex.index !== this.carriageReturnIndex + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(this.buffer.subarray(0, this.carriageReturnIndex - 1)));
        this.buffer = this.buffer.subarray(this.carriageReturnIndex);
        this.carriageReturnIndex = null;
        continue;
      }
      const endIndex = this.carriageReturnIndex !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(this.buffer.subarray(0, endIndex));
      lines.push(line);
      this.buffer = this.buffer.subarray(patternIndex.index);
      this.carriageReturnIndex = null;
    }
    return lines;
  }
  flush() {
    if (!this.buffer.length) {
      return [];
    }
    return this.decode("\n");
  }
};
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex !== null && startIndex !== void 0 ? startIndex : 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  var _a2;
  const logger = client.logger;
  const logLevel = (_a2 = client.logLevel) !== null && _a2 !== void 0 ? _a2 : "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = Object.assign({}, details.options);
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "x-goog-api-key" || name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};
var Stream = class _Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    this.controller = controller;
    this.client = client;
  }
  static fromSSEResponse(response, controller, client) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    function iterator() {
      return __asyncGenerator(this, arguments, function* iterator_1() {
        var _a2, e_1, _b, _c;
        if (consumed) {
          throw new GeminiNextGenAPIClientError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
        }
        consumed = true;
        let done = false;
        try {
          try {
            for (var _d = true, _e = __asyncValues(_iterSSEMessages(response, controller)), _f; _f = yield __await(_e.next()), _a2 = _f.done, !_a2; _d = true) {
              _c = _f.value;
              _d = false;
              const sse = _c;
              if (done)
                continue;
              if (sse.data.startsWith("[DONE]")) {
                done = true;
                continue;
              } else {
                try {
                  yield yield __await(JSON.parse(sse.data));
                } catch (e) {
                  logger.error(`Could not parse message into JSON:`, sse.data);
                  logger.error(`From chunk:`, sse.raw);
                  throw e;
                }
              }
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (!_d && !_a2 && (_b = _e.return))
                yield __await(_b.call(_e));
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
          done = true;
        } catch (e) {
          if (isAbortError(e))
            return yield __await(void 0);
          throw e;
        } finally {
          if (!done)
            controller.abort();
        }
      });
    }
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    function iterLines() {
      return __asyncGenerator(this, arguments, function* iterLines_1() {
        var _a2, e_2, _b, _c;
        const lineDecoder = new LineDecoder();
        const iter = ReadableStreamToAsyncIterable(readableStream);
        try {
          for (var _d = true, iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = yield __await(iter_1.next()), _a2 = iter_1_1.done, !_a2; _d = true) {
            _c = iter_1_1.value;
            _d = false;
            const chunk = _c;
            for (const line of lineDecoder.decode(chunk)) {
              yield yield __await(line);
            }
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (!_d && !_a2 && (_b = iter_1.return))
              yield __await(_b.call(iter_1));
          } finally {
            if (e_2)
              throw e_2.error;
          }
        }
        for (const line of lineDecoder.flush()) {
          yield yield __await(line);
        }
      });
    }
    function iterator() {
      return __asyncGenerator(this, arguments, function* iterator_2() {
        var _a2, e_3, _b, _c;
        if (consumed) {
          throw new GeminiNextGenAPIClientError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
        }
        consumed = true;
        let done = false;
        try {
          try {
            for (var _d = true, _e = __asyncValues(iterLines()), _f; _f = yield __await(_e.next()), _a2 = _f.done, !_a2; _d = true) {
              _c = _f.value;
              _d = false;
              const line = _c;
              if (done)
                continue;
              if (line)
                yield yield __await(JSON.parse(line));
            }
          } catch (e_3_1) {
            e_3 = { error: e_3_1 };
          } finally {
            try {
              if (!_d && !_a2 && (_b = _e.return))
                yield __await(_b.call(_e));
            } finally {
              if (e_3)
                throw e_3.error;
            }
          }
          done = true;
        } catch (e) {
          if (isAbortError(e))
            return yield __await(void 0);
          throw e;
        } finally {
          if (!done)
            controller.abort();
        }
      });
    }
    return new _Stream(iterator, controller, client);
  }
  [Symbol.asyncIterator]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, this.client),
      new _Stream(() => teeIterator(right), this.controller, this.client)
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        var _a2;
        await ((_a2 = iter.return) === null || _a2 === void 0 ? void 0 : _a2.call(iter));
      }
    });
  }
};
function _iterSSEMessages(response, controller) {
  return __asyncGenerator(this, arguments, function* _iterSSEMessages_1() {
    var _a2, e_4, _b, _c;
    if (!response.body) {
      controller.abort();
      if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
        throw new GeminiNextGenAPIClientError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
      }
      throw new GeminiNextGenAPIClientError(`Attempted to iterate over a response with no body`);
    }
    const sseDecoder = new SSEDecoder();
    const lineDecoder = new LineDecoder();
    const iter = ReadableStreamToAsyncIterable(response.body);
    try {
      for (var _d = true, _e = __asyncValues(iterSSEChunks(iter)), _f; _f = yield __await(_e.next()), _a2 = _f.done, !_a2; _d = true) {
        _c = _f.value;
        _d = false;
        const sseChunk = _c;
        for (const line of lineDecoder.decode(sseChunk)) {
          const sse = sseDecoder.decode(line);
          if (sse)
            yield yield __await(sse);
        }
      }
    } catch (e_4_1) {
      e_4 = { error: e_4_1 };
    } finally {
      try {
        if (!_d && !_a2 && (_b = _e.return))
          yield __await(_b.call(_e));
      } finally {
        if (e_4)
          throw e_4.error;
      }
    }
    for (const line of lineDecoder.flush()) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield yield __await(sse);
    }
  });
}
function iterSSEChunks(iterator) {
  return __asyncGenerator(this, arguments, function* iterSSEChunks_1() {
    var _a2, e_5, _b, _c;
    let data = new Uint8Array();
    try {
      for (var _d = true, iterator_3 = __asyncValues(iterator), iterator_3_1; iterator_3_1 = yield __await(iterator_3.next()), _a2 = iterator_3_1.done, !_a2; _d = true) {
        _c = iterator_3_1.value;
        _d = false;
        const chunk = _c;
        if (chunk == null) {
          continue;
        }
        const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
        let newData = new Uint8Array(data.length + binaryChunk.length);
        newData.set(data);
        newData.set(binaryChunk, data.length);
        data = newData;
        let patternIndex;
        while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
          yield yield __await(data.slice(0, patternIndex));
          data = data.slice(patternIndex);
        }
      }
    } catch (e_5_1) {
      e_5 = { error: e_5_1 };
    } finally {
      try {
        if (!_d && !_a2 && (_b = iterator_3.return))
          yield __await(_b.call(iterator_3));
      } finally {
        if (e_5)
          throw e_5.error;
      }
    }
    if (data.length > 0) {
      yield yield __await(data);
    }
  });
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str, delimiter) {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }
  return [str, "", ""];
}
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    var _a2;
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller, client);
      }
      return Stream.fromSSEResponse(response, props.controller, client);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = (_a2 = contentType === null || contentType === void 0 ? void 0 : contentType.split(";")[0]) === null || _a2 === void 0 ? void 0 : _a2.trim();
    const isJSON = (mediaType === null || mediaType === void 0 ? void 0 : mediaType.includes("application/json")) || (mediaType === null || mediaType === void 0 ? void 0 : mediaType.endsWith("+json"));
    if (isJSON) {
      const json = await response.json();
      return json;
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
var APIPromise = class _APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
    this.client = client;
  }
  _thenUnwrap(transform) {
    return new _APIPromise(this.client, this.responsePromise, async (client, props) => transform(await this.parseResponse(client, props), props));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(this.client, data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers !== null && headers !== void 0 ? headers : {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};
var readEnv = (env) => {
  var _a2, _b, _c, _d, _e, _f;
  if (typeof globalThis.process !== "undefined") {
    return (_c = (_b = (_a2 = globalThis.process.env) === null || _a2 === void 0 ? void 0 : _a2[env]) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return (_f = (_e = (_d = globalThis.Deno.env) === null || _d === void 0 ? void 0 : _d.get) === null || _e === void 0 ? void 0 : _e.call(_d, env)) === null || _f === void 0 ? void 0 : _f.trim();
  }
  return void 0;
};
var _a;
var BaseGeminiNextGenAPIClient = class _BaseGeminiNextGenAPIClient {
  /**
   * API Client for interfacing with the Gemini Next Gen API API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['GEMINI_API_KEY'] ?? null]
   * @param {string | undefined} [opts.apiVersion=v1beta]
   * @param {string} [opts.baseURL=process.env['GEMINI_NEXT_GEN_API_BASE_URL'] ?? https://generativelanguage.googleapis.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   */
  constructor(_b) {
    var _c, _d, _e, _f, _g, _h, _j;
    var { baseURL = readEnv("GEMINI_NEXT_GEN_API_BASE_URL"), apiKey = (_c = readEnv("GEMINI_API_KEY")) !== null && _c !== void 0 ? _c : null, apiVersion = "v1beta" } = _b, opts = __rest(_b, ["baseURL", "apiKey", "apiVersion"]);
    const options = Object.assign(Object.assign({
      apiKey,
      apiVersion
    }, opts), { baseURL: baseURL || `https://generativelanguage.googleapis.com` });
    this.baseURL = options.baseURL;
    this.timeout = (_d = options.timeout) !== null && _d !== void 0 ? _d : _BaseGeminiNextGenAPIClient.DEFAULT_TIMEOUT;
    this.logger = (_e = options.logger) !== null && _e !== void 0 ? _e : console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = (_g = (_f = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this)) !== null && _f !== void 0 ? _f : parseLogLevel(readEnv("GEMINI_NEXT_GEN_API_LOG"), "process.env['GEMINI_NEXT_GEN_API_LOG']", this)) !== null && _g !== void 0 ? _g : defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = (_h = options.maxRetries) !== null && _h !== void 0 ? _h : 2;
    this.fetch = (_j = options.fetch) !== null && _j !== void 0 ? _j : getDefaultFetch();
    this.encoder = FallbackEncoder;
    this._options = options;
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
    this.clientAdapter = options.clientAdapter;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor(Object.assign(Object.assign(Object.assign({}, this._options), { baseURL: this.baseURL, maxRetries: this.maxRetries, timeout: this.timeout, logger: this.logger, logLevel: this.logLevel, fetch: this.fetch, fetchOptions: this.fetchOptions, apiKey: this.apiKey, apiVersion: this.apiVersion }), options));
    return client;
  }
  /**
   * Check whether the base URL is set to its default.
   */
  baseURLOverridden() {
    return this.baseURL !== "https://generativelanguage.googleapis.com";
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    if (values.has("authorization") || values.has("x-goog-api-key")) {
      return;
    }
    if (this.apiKey && values.get("x-goog-api-key")) {
      return;
    }
    if (nulls.has("x-goog-api-key")) {
      return;
    }
    throw new Error('Could not resolve authentication method. Expected the apiKey to be set. Or for the "x-goog-api-key" headers to be explicitly omitted');
  }
  async authHeaders(opts) {
    const existingHeaders = buildHeaders([opts.headers]);
    if (existingHeaders.values.has("authorization") || existingHeaders.values.has("x-goog-api-key")) {
      return void 0;
    }
    if (this.apiKey) {
      return buildHeaders([{ "x-goog-api-key": this.apiKey }]);
    }
    if (this.clientAdapter.isVertexAI()) {
      return buildHeaders([await this.clientAdapter.getAuthHeaders()]);
    }
    return void 0;
  }
  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new GeminiNextGenAPIClientError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  buildURL(path2, query, defaultBaseURL) {
    const baseURL = !this.baseURLOverridden() && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path2) ? new URL(path2) : new URL(baseURL + (baseURL.endsWith("/") && path2.startsWith("/") ? path2.slice(1) : path2));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = Object.assign(Object.assign({}, defaultQuery), query);
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
  
     */
  async prepareOptions(options) {
    if (this.clientAdapter && this.clientAdapter.isVertexAI() && !options.path.startsWith(`/${this.apiVersion}/projects/`)) {
      const oldPath = options.path.slice(this.apiVersion.length + 1);
      options.path = `/${this.apiVersion}/projects/${this.clientAdapter.getProject()}/locations/${this.clientAdapter.getLocation()}${oldPath}`;
    }
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path2, opts) {
    return this.methodRequest("get", path2, opts);
  }
  post(path2, opts) {
    return this.methodRequest("post", path2, opts);
  }
  patch(path2, opts) {
    return this.methodRequest("patch", path2, opts);
  }
  put(path2, opts) {
    return this.methodRequest("put", path2, opts);
  }
  delete(path2, opts) {
    return this.methodRequest("delete", path2, opts);
  }
  methodRequest(method, path2, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return Object.assign({ method, path: path2 }, opts2);
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    var _b, _c, _d;
    const options = await optionsInput;
    const maxRetries = (_b = options.maxRetries) !== null && _b !== void 0 ? _b : this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if ((_c = options.signal) === null || _c === void 0 ? void 0 : _c.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if ((_d = options.signal) === null || _d === void 0 ? void 0 : _d.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID !== null && retryOfRequestLogID !== void 0 ? retryOfRequestLogID : requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const responseInfo = `[${requestLogID}${retryLogStr}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID !== null && retryOfRequestLogID !== void 0 ? retryOfRequestLogID : requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const _b = init || {}, { signal, method } = _b, options = __rest(_b, ["signal", "method"]);
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = Object.assign(Object.assign(Object.assign({ signal: controller.signal }, isReadableBody ? { duplex: "half" } : {}), { method: "GET" }), options);
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    var _b;
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders === null || responseHeaders === void 0 ? void 0 : responseHeaders.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders === null || responseHeaders === void 0 ? void 0 : responseHeaders.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = (_b = options.maxRetries) !== null && _b !== void 0 ? _b : this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep$1(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    var _b, _c, _d;
    const options = Object.assign({}, inputOptions);
    const { method, path: path2, query, defaultBaseURL } = options;
    const url = this.buildURL(path2, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = (_b = options.timeout) !== null && _b !== void 0 ? _b : this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ method, headers: reqHeaders }, options.signal && { signal: options.signal }), globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" }), body && { body }), (_c = this.fetchOptions) !== null && _c !== void 0 ? _c : {}), (_d = options.fetchOptions) !== null && _d !== void 0 ? _d : {});
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const authHeaders = await this.authHeaders(options);
    let headers = buildHeaders([
      idempotencyHeaders,
      Object.assign(Object.assign({ Accept: "application/json", "User-Agent": this.getUserAgent(), "X-Stainless-Retry-Count": String(retryCount) }, options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {}), getPlatformHeaders()),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers,
      authHeaders
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body) };
    } else {
      return this.encoder({ body, headers });
    }
  }
};
BaseGeminiNextGenAPIClient.DEFAULT_TIMEOUT = 6e4;
var GeminiNextGenAPIClient = class extends BaseGeminiNextGenAPIClient {
  constructor() {
    super(...arguments);
    this.interactions = new Interactions(this);
  }
};
_a = GeminiNextGenAPIClient;
GeminiNextGenAPIClient.GeminiNextGenAPIClient = _a;
GeminiNextGenAPIClient.GeminiNextGenAPIClientError = GeminiNextGenAPIClientError;
GeminiNextGenAPIClient.APIError = APIError;
GeminiNextGenAPIClient.APIConnectionError = APIConnectionError;
GeminiNextGenAPIClient.APIConnectionTimeoutError = APIConnectionTimeoutError;
GeminiNextGenAPIClient.APIUserAbortError = APIUserAbortError;
GeminiNextGenAPIClient.NotFoundError = NotFoundError;
GeminiNextGenAPIClient.ConflictError = ConflictError;
GeminiNextGenAPIClient.RateLimitError = RateLimitError;
GeminiNextGenAPIClient.BadRequestError = BadRequestError;
GeminiNextGenAPIClient.AuthenticationError = AuthenticationError;
GeminiNextGenAPIClient.InternalServerError = InternalServerError;
GeminiNextGenAPIClient.PermissionDeniedError = PermissionDeniedError;
GeminiNextGenAPIClient.UnprocessableEntityError = UnprocessableEntityError;
GeminiNextGenAPIClient.toFile = toFile;
GeminiNextGenAPIClient.Interactions = Interactions;
var MAX_CHUNK_SIZE = 1024 * 1024 * 8;

// ../../libs/core-ts/src/Domain/Constants/FrontmatterRegistry.ts
var FrontmatterKeys = {
  EloCommands: "!!commands",
  EloPrompt: "!!prompt",
  EloPromptUrl: "!!promptUrl",
  EloImages: "!!images",
  EloAppleContactId: "!!appleContactId",
  Municipio: "Municipio",
  Provincia: "Provincia",
  LugarId: "Lugar Id",
  Region: "Regi\xF3n",
  Pais: "Pa\xEDs",
  Paises: "Pa\xEDses",
  Lugares: "Lugares",
  Lugar: "Lugar",
  SedePrincipal: "Sede principal",
  Latitud: "Latitud",
  Longitud: "Longitud",
  Url: "Url",
  SpotifyUri: "Spotify uri",
  Capital: "Capital",
  Tags: "tags",
  Conocidos: "Conocidos",
  Hijos: "Hijos",
  Padres: "Padres",
  Pareja: "Pareja",
  Exparejas: "Exparejas",
  Hermanos: "Hermanos",
  Familiares: "Familiares",
  CompanerosTrabajo: "Compa\xF1eros de trabajo",
  Jefes: "Jefes",
  Empleados: "Empleados",
  EstilosMusicales: "Estilos musicales",
  SpotifyPopularity: "Spotify popularidad",
  Telefono: "Tel\xE9fono",
  Email: "Email",
  Cumpleanos: "Cumplea\xF1os",
  Apodo: "Apodo",
  Puesto: "Puesto de trabajo",
  Empresa: "Empresa",
  Direcciones: "Direcciones",
  Urls: "Urls",
  Eventos: "Eventos",
  Relaciones: "Relaciones",
  Genero: "G\xE9nero",
  Ocupaciones: "Ocupaciones",
  Intereses: "Intereses",
  Habilidades: "Habilidades",
  Residencias: "Residencias"
};
var FrontmatterRegistry = {
  // Internal fields:
  [FrontmatterKeys.EloCommands]: {
    key: FrontmatterKeys.EloCommands,
    description: "Comandos adicionales para la IA",
    type: "array"
  },
  [FrontmatterKeys.EloPrompt]: {
    key: FrontmatterKeys.EloPrompt,
    description: "Prompt personalizado para la IA",
    type: "string"
  },
  [FrontmatterKeys.EloPromptUrl]: {
    key: FrontmatterKeys.EloPromptUrl,
    description: "URL de contexto para el prompt",
    type: "string"
  },
  // User fields:
  [FrontmatterKeys.Municipio]: {
    key: FrontmatterKeys.Municipio,
    description: "Nombre del municipio, ciudad o pueblo",
    type: "string",
    asLink: true
  },
  [FrontmatterKeys.Provincia]: {
    key: FrontmatterKeys.Provincia,
    description: "Nombre de la provincia administrativa",
    type: "string",
    asLink: true
  },
  [FrontmatterKeys.Region]: {
    key: FrontmatterKeys.Region,
    description: "Comunidad aut\xF3noma o regi\xF3n",
    type: "string",
    asLink: true
  },
  [FrontmatterKeys.Pais]: {
    key: FrontmatterKeys.Pais,
    description: "Pa\xEDs",
    type: "string",
    isRelocateField: true,
    asLink: true,
    commands: ["RelocateNoteByLinkFieldCommand" /* RelocateNoteByLinkField */]
  },
  [FrontmatterKeys.Paises]: {
    key: FrontmatterKeys.Paises,
    description: "Pa\xEDses",
    type: "array",
    isRelocateField: true,
    asLink: true,
    commands: ["RelocateNoteByLinkFieldCommand" /* RelocateNoteByLinkField */]
  },
  [FrontmatterKeys.LugarId]: {
    key: FrontmatterKeys.LugarId,
    description: "Identificador \xFAnico del lugar (ej. Google Place ID)",
    type: "string",
    commands: ["RelocateNoteByLinkFieldCommand" /* RelocateNoteByLinkField */]
  },
  [FrontmatterKeys.Lugar]: {
    key: FrontmatterKeys.Lugar,
    description: "Lugar relacionado",
    type: "string",
    isRelocateField: true,
    asLink: true,
    commands: ["RelocateNoteByLinkFieldCommand" /* RelocateNoteByLinkField */]
  },
  [FrontmatterKeys.Lugares]: {
    key: FrontmatterKeys.Lugares,
    description: "Lugares relacionados",
    type: "array",
    isRelocateField: true,
    asLink: true,
    commands: ["RelocateNoteByLinkFieldCommand" /* RelocateNoteByLinkField */]
  },
  [FrontmatterKeys.SedePrincipal]: {
    key: FrontmatterKeys.SedePrincipal,
    description: "Sede principal",
    isRelocateField: true,
    type: "string",
    asLink: true
  },
  [FrontmatterKeys.Latitud]: {
    key: FrontmatterKeys.Latitud,
    description: "Coordenada de latitud geogr\xE1fica",
    type: "number"
  },
  [FrontmatterKeys.Longitud]: {
    key: FrontmatterKeys.Longitud,
    description: "Coordenada de longitud geogr\xE1fica",
    type: "number"
  },
  [FrontmatterKeys.Url]: {
    key: FrontmatterKeys.Url,
    description: "URL de la web, video, streaming, ...",
    type: "string"
  },
  [FrontmatterKeys.SpotifyUri]: {
    key: FrontmatterKeys.SpotifyUri,
    description: "URI de Spotify",
    type: "string"
  },
  [FrontmatterKeys.Capital]: {
    key: FrontmatterKeys.Capital,
    description: "Capital del pa\xEDs (si aplica)",
    type: "string",
    asLink: true
  },
  [FrontmatterKeys.Tags]: {
    key: FrontmatterKeys.Tags,
    description: "Etiquetas",
    type: "array"
  },
  [FrontmatterKeys.Conocidos]: {
    key: FrontmatterKeys.Conocidos,
    description: "Lista de conocidos",
    type: "array",
    reciprocityField: FrontmatterKeys.Conocidos,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Hijos]: {
    key: FrontmatterKeys.Hijos,
    description: "Hijos de la persona",
    type: "array",
    reciprocityField: FrontmatterKeys.Padres,
    amongField: FrontmatterKeys.Hermanos,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Padres]: {
    key: FrontmatterKeys.Padres,
    description: "Padres de la persona",
    type: "array",
    reciprocityField: FrontmatterKeys.Hijos,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Pareja]: {
    key: FrontmatterKeys.Pareja,
    description: "Pareja actual",
    type: "array",
    reciprocityField: FrontmatterKeys.Pareja,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Exparejas]: {
    key: FrontmatterKeys.Exparejas,
    description: "Exparejas",
    type: "array",
    reciprocityField: FrontmatterKeys.Exparejas,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Hermanos]: {
    key: FrontmatterKeys.Hermanos,
    description: "Hermanos",
    type: "array",
    reciprocityField: FrontmatterKeys.Hermanos,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Familiares]: {
    key: FrontmatterKeys.Familiares,
    description: "Otros familiares",
    type: "array",
    reciprocityField: FrontmatterKeys.Familiares,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.CompanerosTrabajo]: {
    key: FrontmatterKeys.CompanerosTrabajo,
    description: "Compa\xF1eros de trabajo",
    type: "array",
    reciprocityField: FrontmatterKeys.CompanerosTrabajo,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Jefes]: {
    key: FrontmatterKeys.Jefes,
    description: "Jefes directos",
    type: "array",
    reciprocityField: FrontmatterKeys.Empleados,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.Empleados]: {
    key: FrontmatterKeys.Empleados,
    description: "Empleados a cargo",
    type: "array",
    reciprocityField: FrontmatterKeys.Jefes,
    asLink: true,
    commands: ["CreateReciprocityLinksNotesCommand" /* CreateReciprocityLinksNotes */]
  },
  [FrontmatterKeys.EstilosMusicales]: {
    key: FrontmatterKeys.EstilosMusicales,
    description: "Estilos musicales del artista",
    type: "array"
  },
  [FrontmatterKeys.SpotifyPopularity]: {
    key: FrontmatterKeys.SpotifyPopularity,
    description: "Popularidad del artista en Spotify (0-100)",
    type: "number"
  },
  [FrontmatterKeys.EloImages]: {
    key: FrontmatterKeys.EloImages,
    description: "Lista de fotos enlazadas (elo-bridge)",
    type: "array"
  },
  [FrontmatterKeys.Telefono]: {
    key: FrontmatterKeys.Telefono,
    description: "Tel\xE9fono de contacto",
    type: "string"
  },
  [FrontmatterKeys.Email]: {
    key: FrontmatterKeys.Email,
    description: "Email de contacto",
    type: "string"
  },
  [FrontmatterKeys.Cumpleanos]: {
    key: FrontmatterKeys.Cumpleanos,
    description: "Cumplea\xF1os (YYYY-MM-DD)",
    type: "date"
  },
  [FrontmatterKeys.EloAppleContactId]: {
    key: FrontmatterKeys.EloAppleContactId,
    description: "ID de contacto en Apple (elo-bridge)",
    type: "string"
  },
  [FrontmatterKeys.Apodo]: {
    key: FrontmatterKeys.Apodo,
    description: "Apodo o nombre corto",
    type: "string"
  },
  [FrontmatterKeys.Puesto]: {
    key: FrontmatterKeys.Puesto,
    description: "Puesto de trabajo o cargo",
    type: "string"
  },
  [FrontmatterKeys.Empresa]: {
    key: FrontmatterKeys.Empresa,
    description: "Empresa u organizaci\xF3n",
    type: "string"
  },
  [FrontmatterKeys.Direcciones]: {
    key: FrontmatterKeys.Direcciones,
    description: "Direcciones postales",
    type: "array"
  },
  [FrontmatterKeys.Urls]: {
    key: FrontmatterKeys.Urls,
    description: "Sitios web y enlaces",
    type: "array"
  },
  [FrontmatterKeys.Eventos]: {
    key: FrontmatterKeys.Eventos,
    description: "Eventos o fechas importantes",
    type: "array"
  },
  [FrontmatterKeys.Relaciones]: {
    key: FrontmatterKeys.Relaciones,
    description: "Relaciones con otras personas",
    type: "array"
  },
  [FrontmatterKeys.Genero]: {
    key: FrontmatterKeys.Genero,
    description: "G\xE9nero",
    type: "string"
  },
  [FrontmatterKeys.Ocupaciones]: {
    key: FrontmatterKeys.Ocupaciones,
    description: "Ocupaciones (adicionales al puesto)",
    type: "array"
  },
  [FrontmatterKeys.Intereses]: {
    key: FrontmatterKeys.Intereses,
    description: "Intereses",
    type: "array"
  },
  [FrontmatterKeys.Habilidades]: {
    key: FrontmatterKeys.Habilidades,
    description: "Habilidades",
    type: "array"
  },
  [FrontmatterKeys.Residencias]: {
    key: FrontmatterKeys.Residencias,
    description: "Residencias o lugares de vivienda",
    type: "array"
  }
};

// ../../libs/core-ts/src/Domain/Constants/HeaderMetadataRegistry.ts
var HeaderMetadataKeys = {
  Score: "score",
  Difficulty: "difficulty",
  Importance: "importance",
  Attempts: "attempts"
};
var HeaderMetadataRegistry = {
  [HeaderMetadataKeys.Score]: {
    key: HeaderMetadataKeys.Score,
    description: "Puntuaci\xF3n asociada al contenido",
    type: "number",
    defaultValue: 0
  },
  [HeaderMetadataKeys.Difficulty]: {
    key: HeaderMetadataKeys.Difficulty,
    description: "Nivel de dificultad",
    type: "number",
    defaultValue: 0
  },
  [HeaderMetadataKeys.Importance]: {
    key: HeaderMetadataKeys.Importance,
    description: "Nivel de importancia",
    type: "number",
    defaultValue: 0
  },
  [HeaderMetadataKeys.Attempts]: {
    key: HeaderMetadataKeys.Attempts,
    description: "N\xFAmero de intentos",
    type: "number",
    defaultValue: 0
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianNotificationAdapter.ts
var import_obsidian7 = require("obsidian");
var ObsidianNotificationAdapter = class {
  showMessage(message) {
    new import_obsidian7.Notice(message);
  }
  showError(message) {
    new import_obsidian7.Notice(`Error: ${message}`);
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianUIServiceAdapter.ts
var import_obsidian9 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Presentation/Obsidian/Views/Modals/GenericFuzzySuggestModal.ts
var import_obsidian8 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianContextAdapter.ts
var import_obsidian10 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Presentation/Obsidian/Utils/Messages.ts
var import_obsidian11 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/Utils/ViewMode.ts
var import_obsidian12 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/Utils/Frontmatter.ts
var import_obsidian13 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianRoleRepository.ts
var import_obsidian14 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianNoteManager.ts
var import_obsidian15 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianTranslationAdapter.ts
var ObsidianTranslationAdapter = class {
  constructor(resources) {
    this.resources = resources;
    this.locale = window.moment ? window.moment.locale() : "en";
  }
  t(key, args) {
    const localeResources = this.resources[this.locale] || this.resources["en"] || {};
    let translation = localeResources[key];
    if (!translation) {
      const fallbackResources = this.resources["en"] || {};
      translation = fallbackResources[key] || key;
    }
    if (args) {
      Object.keys(args).forEach((argKey) => {
        translation = translation.replace(`{${argKey}}`, args[argKey]);
      });
    }
    return translation;
  }
};

// src/I18n/locales/en.ts
var en_default = {
  "plugin.name": "Subtitles Plugin"
};

// src/I18n/locales/es.ts
var es_default = {
  "plugin.name": "Plugin de Subt\xEDtulos"
};

// src/Infrastructure/Presentation/Obsidian/main.ts
var SubtitlesPlugin = class extends import_obsidian16.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.translationService = new ObsidianTranslationAdapter({ en: en_default, es: es_default });
    this.addSettingTab(new SubtitlesSettingsView(this.app, this));
    const subtitlesAdapter = new OpenSubtitlesAdapter({
      apiKey: this.settings.openSubtitlesApiKey,
      username: this.settings.openSubtitlesUsername,
      password: this.settings.openSubtitlesPassword
    });
    const noteRepository = new ObsidianNoteRepository(this.app);
    const notificationAdapter = new ObsidianNotificationAdapter();
    this.addCommand({
      id: "elo-download-subtitles",
      name: "Series: Download Subtitles",
      editorCallback: async (_editor, view) => {
        const editorAdapter = new ObsidianEditorAdapter(view);
        const downloadSubtitlesUseCase = new DownloadSubtitlesUseCase(
          subtitlesAdapter,
          noteRepository,
          editorAdapter,
          notificationAdapter
        );
        await downloadSubtitlesUseCase.execute();
      }
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
/*! Bundled license information:

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)

@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/

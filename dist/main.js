/* eslint-disable */

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../libs/core-typescript/dist/Adapters/EloServerLlmAdapter.js
var require_EloServerLlmAdapter = __commonJS({
  "../../libs/core-typescript/dist/Adapters/EloServerLlmAdapter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EloServerLlmAdapter = void 0;
    var EloServerLlmAdapter = class {
      constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.authToken = authToken;
      }
      updateConfig(baseUrl, authToken) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.authToken = authToken;
      }
      async fetchAi(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.authToken}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Elo Server AI Error (${response.status}): ${errorText}`);
        }
        return response.json();
      }
      async requestEnrichment(params) {
        const data = await this.fetchAi("/api/ai/generate", {
          prompt: params.prompt,
          json_mode: true
        });
        try {
          return JSON.parse(data.response);
        } catch (e) {
          return { body: data.response };
        }
      }
      async requestStreamBrief(params) {
        const data = await this.fetchAi("/api/ai/generate", {
          prompt: params.prompt
        });
        return data.response;
      }
      async request(params) {
        const data = await this.fetchAi("/api/ai/generate", {
          prompt: params.prompt
        });
        return data.response;
      }
      async requestJson(params) {
        const data = await this.fetchAi("/api/ai/generate", {
          prompt: params.prompt,
          json_mode: true
        });
        try {
          return JSON.parse(data.response);
        } catch (e) {
          console.error("Failed to parse JSON response from Elo Server", e);
          return null;
        }
      }
    };
    exports.EloServerLlmAdapter = EloServerLlmAdapter;
  }
});

// ../../libs/core-typescript/dist/Adapters/EloServerImagesAdapter.js
var require_EloServerImagesAdapter = __commonJS({
  "../../libs/core-typescript/dist/Adapters/EloServerImagesAdapter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EloServerImagesAdapter = void 0;
    var EloServerImagesAdapter = class {
      constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.authToken = authToken;
      }
      updateConfig(baseUrl, authToken) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.authToken = authToken;
      }
      async fetchAi(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.authToken}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Elo Server AI Vision Error (${response.status}): ${errorText}`);
        }
        return response.json();
      }
      async generateContentFromImages(images, additionalPrompt = "") {
        const prompt = `
      Analiza las siguientes im\xE1genes que corresponden a lecciones de libros de texto.
      ${additionalPrompt}
      
      Instrucciones:
      1. Primero transcribe el texto literalmente de todas las im\xE1genes en orden.
      2. Luego analiza el contenido en profundidad.
    `;
        const expectedSchema = {
          type: "object",
          properties: {
            literal_transcription: {
              type: "string",
              description: "Transcripci\xF3n literal completa en markdown."
            },
            analysis: {
              type: "string",
              description: "An\xE1lisis detallado y resumen."
            }
          },
          required: ["literal_transcription", "analysis"]
        };
        const data = await this.fetchAi("/api/ai/vision", {
          prompt,
          images,
          json_mode: true,
          expected_schema: expectedSchema
        });
        try {
          return JSON.parse(data.response);
        } catch (e) {
          console.error("Failed to parse vision response from Elo Server", e);
          return null;
        }
      }
      async generateEnrichmentFromImages(images, promptTemplate) {
        const prompt = `
      ${promptTemplate}
      
      Analiza las im\xE1genes proporcionadas y utiliza su contenido para cumplir con la solicitud.
      Responde SOLAMENTE con el JSON v\xE1lido que contenga "body" y opcionalmente "frontmatter".
    `;
        const data = await this.fetchAi("/api/ai/vision", {
          prompt,
          images,
          json_mode: true
        });
        try {
          return JSON.parse(data.response);
        } catch (e) {
          console.error("Failed to parse vision enrichment response from Elo Server", e);
          return null;
        }
      }
    };
    exports.EloServerImagesAdapter = EloServerImagesAdapter;
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/ContextProviderPort.js
var require_ContextProviderPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/ContextProviderPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/GeocodingPort.js
var require_GeocodingPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/GeocodingPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/HeaderDataPort.js
var require_HeaderDataPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/HeaderDataPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/ImageSearchPort.js
var require_ImageSearchPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/ImageSearchPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/LlmPort.js
var require_LlmPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/LlmPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/MetadataPort.js
var require_MetadataPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/MetadataPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/MusicProviderPort.js
var require_MusicProviderPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/MusicProviderPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/NoteManagerPort.js
var require_NoteManagerPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/NoteManagerPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/RoleRepositoryPort.js
var require_RoleRepositoryPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/RoleRepositoryPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/SettingsPort.js
var require_SettingsPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/SettingsPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/TranscriptionPort.js
var require_TranscriptionPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/TranscriptionPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Ports/YouTubeTranscriptPort.js
var require_YouTubeTranscriptPort = __commonJS({
  "../../libs/core-typescript/dist/Domain/Ports/YouTubeTranscriptPort.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Constants/HeaderMetadataRegistry.js
var require_HeaderMetadataRegistry = __commonJS({
  "../../libs/core-typescript/dist/Domain/Constants/HeaderMetadataRegistry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HeaderMetadataRegistry = exports.HeaderMetadataKeys = void 0;
    exports.HeaderMetadataKeys = {
      Score: "score",
      Difficulty: "difficulty",
      Importance: "importance",
      Attempts: "attempts"
    };
    exports.HeaderMetadataRegistry = {
      [exports.HeaderMetadataKeys.Score]: {
        key: exports.HeaderMetadataKeys.Score,
        description: "Puntuaci\xF3n asociada al contenido",
        type: "number",
        defaultValue: 0
      },
      [exports.HeaderMetadataKeys.Difficulty]: {
        key: exports.HeaderMetadataKeys.Difficulty,
        description: "Nivel de dificultad",
        type: "number",
        defaultValue: 0
      },
      [exports.HeaderMetadataKeys.Importance]: {
        key: exports.HeaderMetadataKeys.Importance,
        description: "Nivel de importancia",
        type: "number",
        defaultValue: 0
      },
      [exports.HeaderMetadataKeys.Attempts]: {
        key: exports.HeaderMetadataKeys.Attempts,
        description: "N\xFAmero de intentos",
        type: "number",
        defaultValue: 0
      }
    };
  }
});

// ../../libs/core-typescript/dist/Domain/Constants/TagFolderMappingRegistry.js
var require_TagFolderMappingRegistry = __commonJS({
  "../../libs/core-typescript/dist/Domain/Constants/TagFolderMappingRegistry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TagFolderMappingRegistry = void 0;
    exports.setTagFolderMapping = setTagFolderMapping;
    exports.TagFolderMappingRegistry = {};
    function setTagFolderMapping(mapping) {
      for (const key of Object.keys(exports.TagFolderMappingRegistry)) {
        delete exports.TagFolderMappingRegistry[key];
      }
      Object.assign(exports.TagFolderMappingRegistry, mapping);
    }
  }
});

// ../../libs/core-typescript/dist/Domain/Types/PlaceMetadata.js
var require_PlaceMetadata = __commonJS({
  "../../libs/core-typescript/dist/Domain/Types/PlaceMetadata.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Types/Role.js
var require_Role = __commonJS({
  "../../libs/core-typescript/dist/Domain/Types/Role.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../libs/core-typescript/dist/Domain/Utils/ScoreUtils.js
var require_ScoreUtils = __commonJS({
  "../../libs/core-typescript/dist/Domain/Utils/ScoreUtils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normalizeImportance = normalizeImportance;
    exports.normalizeDifficulty = normalizeDifficulty;
    exports.difficultyToColor = difficultyToColor;
    function normalizeImportance(importance) {
      if (importance <= 1)
        return 1;
      if (importance >= 5)
        return 5;
      return Math.round(importance);
    }
    function normalizeDifficulty(difficulty) {
      if (difficulty <= 1)
        return 1;
      if (difficulty >= 3)
        return 3;
      return Math.round(difficulty);
    }
    function difficultyToColor(difficulty) {
      const normalized = normalizeDifficulty(difficulty);
      if (normalized === 1)
        return "#50fa7b";
      if (normalized === 2)
        return "#ffb86c";
      return "#ff5555";
    }
  }
});

// ../../libs/core-typescript/dist/index.js
var require_dist = __commonJS({
  "../../libs/core-typescript/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
          __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_EloServerLlmAdapter(), exports);
    __exportStar(require_EloServerImagesAdapter(), exports);
    __exportStar(require_ContextProviderPort(), exports);
    __exportStar(require_GeocodingPort(), exports);
    __exportStar(require_HeaderDataPort(), exports);
    __exportStar(require_ImageSearchPort(), exports);
    __exportStar(require_LlmPort(), exports);
    __exportStar(require_MetadataPort(), exports);
    __exportStar(require_MusicProviderPort(), exports);
    __exportStar(require_NoteManagerPort(), exports);
    __exportStar(require_RoleRepositoryPort(), exports);
    __exportStar(require_SettingsPort(), exports);
    __exportStar(require_TranscriptionPort(), exports);
    __exportStar(require_YouTubeTranscriptPort(), exports);
    __exportStar(require_HeaderMetadataRegistry(), exports);
    __exportStar(require_TagFolderMappingRegistry(), exports);
    __exportStar(require_PlaceMetadata(), exports);
    __exportStar(require_Role(), exports);
    __exportStar(require_ScoreUtils(), exports);
  }
});

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
      this.notification.showMessage("subtitles.noActiveFile");
      return;
    }
    const metadata = await this.noteRepository.getNoteMetadata(activeFilePath);
    const frontmatter = metadata == null ? void 0 : metadata.frontmatter;
    if (!frontmatter) {
      this.notification.showMessage("subtitles.noFrontmatter");
      return;
    }
    const serie = frontmatter["Serie"];
    const season = frontmatter["Temporada"];
    const episode = frontmatter["Capitulo"];
    if (!serie || !season || !episode) {
      this.notification.showMessage("subtitles.missingFields");
      return;
    }
    this.notification.showMessage("subtitles.searching", { serie, season, episode });
    try {
      const results = await this.subtitlesPort.search(serie, Number(season), Number(episode));
      if (results.length === 0) {
        this.notification.showMessage("subtitles.noSubtitlesFound");
        return;
      }
      const bestMatch = results[0];
      if (!bestMatch.attributes.files || bestMatch.attributes.files.length === 0) {
        this.notification.showMessage("subtitles.noFiles");
        return;
      }
      const fileId = bestMatch.attributes.files[0].file_id;
      this.notification.showMessage("subtitles.downloading");
      const subtitleContent = await this.subtitlesPort.download(fileId);
      const currentContent = await this.editor.getValue();
      const newContent = currentContent + "\n\n## Subtitles\n\n" + subtitleContent;
      await this.editor.setValue(newContent);
      this.notification.showMessage("subtitles.success");
    } catch (error) {
      console.error(error);
      this.notification.showMessage("subtitles.error");
    }
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianNoteRepository.ts
var import_obsidian3 = require("obsidian");
var ObsidianNoteRepository = class {
  constructor(app) {
    this.app = app;
  }
  async getNoteMetadata(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
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
  async readNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path}`);
    return await this.app.vault.read(file);
  }
  async appendContent(path, content) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path}`);
    const currentContent = await this.app.vault.read(file);
    await this.app.vault.modify(file, currentContent + content);
  }
  async updateFrontmatter(path, callback) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path}`);
    await this.app.fileManager.processFrontMatter(file, callback);
  }
  async createNote(path, content) {
    const file = await this.app.vault.create(path, content);
    return {
      path: file.path,
      basename: file.basename,
      frontmatter: {},
      tags: []
    };
  }
  async exists(path) {
    return await this.app.vault.adapter.exists(path);
  }
  async createFolder(path) {
    if (!await this.exists(path)) {
      await this.app.vault.createFolder(path);
    }
  }
  async getTemplateContent(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian3.TFile) {
      return await this.app.vault.read(file);
    }
    return null;
  }
  async writeNote(path, content) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile))
      throw new Error(`File not found: ${path}`);
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
    var _a;
    return ((_a = this.view.file) == null ? void 0 : _a.basename) || "";
  }
  getNotePath() {
    var _a;
    return ((_a = this.view.file) == null ? void 0 : _a.path) || "";
  }
};

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianFileSystemAdapter.ts
var import_obsidian5 = require("obsidian");

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianMetadataAdapter.ts
var import_obsidian6 = require("obsidian");
var import_dist = __toESM(require_dist());

// ../../libs/obsidian-plugin/src/Infrastructure/Adapters/Obsidian/ObsidianNotificationAdapter.ts
var import_obsidian7 = require("obsidian");
var ObsidianNotificationAdapter = class {
  constructor(translationService) {
    this.translationService = translationService;
  }
  showMessage(keyOrMessage, args) {
    const message = this.translationService ? this.translationService.t(keyOrMessage, args) : keyOrMessage;
    new import_obsidian7.Notice(message);
  }
  showError(keyOrMessage, args) {
    const message = this.translationService ? this.translationService.t(keyOrMessage, args) : keyOrMessage;
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
        const value = args[argKey] === void 0 || args[argKey] === null ? "" : String(args[argKey]);
        translation = translation.split(`{{${argKey}}}`).join(value).split(`{${argKey}}`).join(value);
      });
    }
    return translation;
  }
};

// src/I18n/locales/en.ts
var en_default = {
  "plugin.name": "Subtitles Plugin",
  "command.downloadSubtitles": "Series: Download Subtitles",
  "subtitles.noActiveFile": "No active file found.",
  "subtitles.noFrontmatter": "No frontmatter found.",
  "subtitles.missingFields": "Missing Serie, Temporada, or Capitulo fields.",
  "subtitles.searching": "Searching subtitles for {{serie}} S{{season}}E{{episode}}...",
  "subtitles.noSubtitlesFound": "No subtitles found.",
  "subtitles.noFiles": "Subtitle entry has no files.",
  "subtitles.downloading": "Downloading subtitle...",
  "subtitles.success": "Subtitles downloaded and appended.",
  "subtitles.error": "Error downloading subtitles. Check console."
};

// src/I18n/locales/es.ts
var es_default = {
  "plugin.name": "Plugin de Subt\xEDtulos",
  "command.downloadSubtitles": "Series: Descargar Subt\xEDtulos",
  "subtitles.noActiveFile": "No se encontr\xF3 un archivo activo.",
  "subtitles.noFrontmatter": "No se encontr\xF3 frontmatter en la nota.",
  "subtitles.missingFields": "Faltan los campos Serie, Temporada o Capitulo.",
  "subtitles.searching": "Buscando subt\xEDtulos para {{serie}} S{{season}}E{{episode}}...",
  "subtitles.noSubtitlesFound": "No se encontraron subt\xEDtulos.",
  "subtitles.noFiles": "La entrada de subt\xEDtulos no tiene archivos.",
  "subtitles.downloading": "Descargando subt\xEDtulo...",
  "subtitles.success": "Subt\xEDtulos descargados y a\xF1adidos.",
  "subtitles.error": "Error al descargar subt\xEDtulos. Revisa la consola."
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
    const notificationAdapter = new ObsidianNotificationAdapter(this.translationService);
    this.addCommand({
      id: "elo-download-subtitles",
      name: this.translationService.t("command.downloadSubtitles"),
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
//# sourceMappingURL=main.js.map

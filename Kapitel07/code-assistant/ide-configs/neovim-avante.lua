-- Neovim Avante.nvim Konfiguration für Ollama
-- Kapitel 7: Code-Assistent mit Ollama
--
-- Installation:
--   Packer: use { "yetone/avante.nvim", ... }
--   Lazy: { "yetone/avante.nvim", ... }
--
-- Platziere diese Konfiguration in deiner init.lua

return {
  "yetone/avante.nvim",
  event = "VeryLazy",
  lazy = false,
  version = false,
  opts = {
    provider = "ollama",
    ollama = {
      model = "qwen2.5-coder:32b-instruct",
      endpoint = "http://localhost:11434",
      temperature = 0.3,
      max_tokens = 4096,
      timeout = 60000,
    },
    -- Alternativ-Provider für Vergleich
    vendors = {
      ollama_small = {
        __inherited_from = "ollama",
        model = "qwen2.5-coder:7b-instruct",
      },
      ollama_deepseek = {
        __inherited_from = "ollama",
        model = "deepseek-coder-v2:16b",
      },
    },
    -- UI-Einstellungen
    windows = {
      position = "right",
      wrap = true,
      width = 40,
      sidebar_header = {
        enabled = true,
        align = "center",
        rounded = true,
      },
    },
    -- Keymaps
    mappings = {
      ask = "<leader>aa",
      edit = "<leader>ae",
      refresh = "<leader>ar",
      toggle = {
        default = "<leader>at",
        debug = "<leader>ad",
        hint = "<leader>ah",
      },
    },
    hints = { enabled = true },
    -- Code-Highlighting
    highlights = {
      diff = {
        current = "DiffText",
        incoming = "DiffAdd",
      },
    },
  },
  -- Dependencies
  dependencies = {
    "nvim-treesitter/nvim-treesitter",
    "stevearc/dressing.nvim",
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
    -- Optional: Syntax Highlighting
    {
      "MeanderingProgrammer/render-markdown.nvim",
      opts = {
        file_types = { "markdown", "Avante" },
      },
      ft = { "markdown", "Avante" },
    },
  },
}

-- Custom Commands für häufige Operationen
-- Füge diese zu deiner init.lua hinzu:
--[[
vim.api.nvim_create_user_command("AvanteExplain", function()
  require("avante").ask("Erkläre diesen Code detailliert auf Deutsch")
end, { desc = "Code mit Avante erklären" })

vim.api.nvim_create_user_command("AvanteTest", function()
  require("avante").ask("Schreibe Unit-Tests für diesen Code")
end, { desc = "Tests mit Avante generieren" })

vim.api.nvim_create_user_command("AvanteRefactor", function()
  require("avante").ask("Refaktoriere diesen Code für bessere Lesbarkeit")
end, { desc = "Code mit Avante refaktorieren" })

vim.api.nvim_create_user_command("AvanteDocument", function()
  require("avante").ask("Füge Dokumentation zu diesem Code hinzu")
end, { desc = "Code mit Avante dokumentieren" })

vim.api.nvim_create_user_command("AvanteFix", function()
  require("avante").ask("Finde und behebe Bugs in diesem Code")
end, { desc = "Bugs mit Avante finden" })
--]]

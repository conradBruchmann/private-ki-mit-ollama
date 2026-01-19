/**
 * Text Preprocessor - Bereinigung und Normalisierung
 * Kapitel 9: RAG-Architekturen
 */

export interface PreprocessorOptions {
  normalizeWhitespace?: boolean;
  removeExtraNewlines?: boolean;
  trimLines?: boolean;
  removeTabs?: boolean;
  normalizeUnicode?: boolean;
  removeControlChars?: boolean;
  minLineLength?: number;
}

const DEFAULT_OPTIONS: PreprocessorOptions = {
  normalizeWhitespace: true,
  removeExtraNewlines: true,
  trimLines: true,
  removeTabs: true,
  normalizeUnicode: true,
  removeControlChars: true,
  minLineLength: 0,
};

export class TextPreprocessor {
  private options: PreprocessorOptions;

  constructor(options: PreprocessorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Führt alle Preprocessing-Schritte aus
   */
  process(text: string): string {
    let result = text;

    if (this.options.removeControlChars) {
      result = this.removeControlCharacters(result);
    }

    if (this.options.normalizeUnicode) {
      result = this.normalizeUnicode(result);
    }

    if (this.options.removeTabs) {
      result = this.replaceTabs(result);
    }

    if (this.options.normalizeWhitespace) {
      result = this.normalizeWhitespace(result);
    }

    if (this.options.trimLines) {
      result = this.trimLines(result);
    }

    if (this.options.removeExtraNewlines) {
      result = this.removeExtraNewlines(result);
    }

    if (this.options.minLineLength && this.options.minLineLength > 0) {
      result = this.filterShortLines(result, this.options.minLineLength);
    }

    return result.trim();
  }

  /**
   * Entfernt Steuerzeichen (außer Newlines)
   */
  private removeControlCharacters(text: string): string {
    // Behält \n und \r, entfernt andere Steuerzeichen
    return text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }

  /**
   * Normalisiert Unicode (NFC-Form)
   */
  private normalizeUnicode(text: string): string {
    return text.normalize("NFC");
  }

  /**
   * Ersetzt Tabs durch Leerzeichen
   */
  private replaceTabs(text: string): string {
    return text.replace(/\t/g, "    ");
  }

  /**
   * Normalisiert Whitespace (mehrere Leerzeichen → ein Leerzeichen)
   */
  private normalizeWhitespace(text: string): string {
    // Ersetzt mehrere Leerzeichen durch ein einzelnes (aber nicht Newlines)
    return text.replace(/ {2,}/g, " ");
  }

  /**
   * Trimmt jede Zeile
   */
  private trimLines(text: string): string {
    return text
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }

  /**
   * Reduziert mehrere aufeinanderfolgende Leerzeilen auf maximal zwei
   */
  private removeExtraNewlines(text: string): string {
    return text.replace(/\n{3,}/g, "\n\n");
  }

  /**
   * Filtert Zeilen die kürzer als minLength sind
   */
  private filterShortLines(text: string, minLength: number): string {
    return text
      .split("\n")
      .filter((line) => line.length === 0 || line.length >= minLength)
      .join("\n");
  }
}

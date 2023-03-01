export abstract class Record {
  protected readonly words: string[];
  protected readonly record: string;

  public constructor(record: string) {
    if (record.endsWith('"')) {
      record = record.substring(0, record.length - 1);
    }
    if (record.endsWith("'")) {
      record = record.substring(0, record.length - 1);
    }
    const recordWords = record.split(" ");
    const creditWordIndex = recordWords.findIndex((word) =>
      word.includes(this.keyword)
    );
    this.words = recordWords.splice(creditWordIndex + 1);
    this.record = this.words.join(" ");
  }

  protected abstract get keyword(): string;
}

import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import screenshot from "screenshot-desktop";

abstract class ScreenshotHandler {
  protected queue: string[] = [];
  protected readonly MAX_SCREENSHOTS = 5;

  constructor(protected dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  abstract getDir(): string;

  getQueue(): string[] {
    return this.queue;
  }

  addToQueue(filePath: string): void {
    this.queue.push(filePath);
    if (this.queue.length > this.MAX_SCREENSHOTS) {
      const removed = this.queue.shift();
      if (removed) this.deleteFile(removed);
    }
  }

  removeFromQueue(filePath: string): void {
    this.queue = this.queue.filter(p => p !== filePath);
    this.deleteFile(filePath);
  }

  clearQueue(): void {
    this.queue.forEach(filePath => this.deleteFile(filePath));
    this.queue = [];
  }

  async clearQueueFiles(): Promise<void> {
    const files = [...this.queue];
    this.queue = [];
    const deletions = files.map(p => fs.promises.unlink(p).catch(err => {
      console.error(`[${this.constructor.name}] Failed to delete ${p}:`, err);
    }));
    await Promise.all(deletions);
  }

  protected deleteFile(filePath: string) {
    fs.promises.unlink(filePath).catch(err => {
      console.error(`[${this.constructor.name}] Failed to delete ${filePath}:`, err);
    });
  }
}

class QueueScreenshotHandler extends ScreenshotHandler {
  getDir(): string {
    return this.dir;
  }
}

class ExtraScreenshotHandler extends ScreenshotHandler {
  getDir(): string {
    return this.dir;
  }
}

export class ScreenshotHelper {
  private handler: ScreenshotHandler;
  private view: "queue" | "solutions" = "queue";

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view;

    const screenshotDir = path.join(app.getPath("userData"), "screenshots");
    const extraScreenshotDir = path.join(app.getPath("userData"), "extra_screenshots");

    this.handler = view === "queue"
      ? new QueueScreenshotHandler(screenshotDir)
      : new ExtraScreenshotHandler(extraScreenshotDir);
  }

  public getView(): "queue" | "solutions" {
    return this.view;
  }

  public setView(view: "queue" | "solutions"): void {
    if (this.view === view) return; // no change
    this.view = view;

    const screenshotDir = path.join(app.getPath("userData"), "screenshots");
    const extraScreenshotDir = path.join(app.getPath("userData"), "extra_screenshots");

    this.handler = view === "queue"
      ? new QueueScreenshotHandler(screenshotDir)
      : new ExtraScreenshotHandler(extraScreenshotDir);
  }

  public getScreenshotQueue(): string[] {
    return this.handler.getQueue();
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    hideMainWindow();

    const screenshotPath = path.join(this.handler.getDir(), `${uuidv4()}.png`);
    await screenshot({ filename: screenshotPath });

    this.handler.addToQueue(screenshotPath);

    showMainWindow();
    return screenshotPath;
  }

  public async deleteScreenshot(
    filePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.handler.removeFromQueue(filePath);
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public clearQueues(): void {
    this.handler.clearQueue();
  }

  public async clearExtraQueueFiles(): Promise<void> {
    if (this.handler instanceof ExtraScreenshotHandler) {
      await this.handler.clearQueueFiles();
      console.log("[ScreenshotHelper] Extra screenshot queue cleared.");
    } else {
      console.warn("[ScreenshotHelper] Current view is not 'solutions'. No extra files deleted.");
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Error reading image:", error);
      throw error;
    }
  }
}

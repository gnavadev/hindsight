import { AppState } from './main';
import path from 'path';
import { app, ipcMain } from 'electron';
import fs from 'fs';

export class AudioHelper {
  private appState: AppState;
  private tempPath: string = '';
  private isRecording = false;

  constructor(appState: AppState) {
    this.appState = appState;

    // Listen for audio data from renderer
    ipcMain.on('system-audio-data', (event, chunk: Buffer) => {
      if (this.isRecording && this.tempPath) {
        fs.appendFileSync(this.tempPath, chunk);
      }
    });

    ipcMain.on('system-audio-stop', async () => {
      this.isRecording = false;
      console.log(`Audio saved to ${this.tempPath}`);
      await this.processAudioFile(this.tempPath);
    });
  }

  public startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.tempPath = path.join(app.getPath('temp'), `hindsight-audio-${Date.now()}.webm`);
    fs.writeFileSync(this.tempPath, ''); // clear/create file
    this.appState.getMainWindow()?.webContents.send('start-system-audio');
    console.log('Requested system audio recording from renderer');
  }

  public stopRecording() {
    if (!this.isRecording) return;
    this.appState.getMainWindow()?.webContents.send('stop-system-audio');
  }

  private async processAudioFile(filePath: string) {
    try {
      const mainWindow = this.appState.getMainWindow();
      if (!mainWindow) return;

      const result = await this.appState.processingHelper.getLLMHelper().analyzeAudioFile(filePath);
      console.log("Audio analysis result:", result.text);

      const problemInfo = {
        problem_type: 'q_and_a',
        problem_statement: result.text,
        details: { question: result.text, context: "Transcribed from system audio." }
      };

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo);
      this.appState.setProblemInfo(problemInfo);
      this.appState.setView('solutions');

      fs.unlink(filePath, err => {
        if (err) console.error(`Failed to delete temp file: ${err}`);
        else console.log(`Deleted temporary audio file: ${filePath}`);
      });
    } catch (error) {
      console.error("Error processing audio file:", error);
    }
  }
}

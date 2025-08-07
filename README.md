# Hindsight

An open-source, context-aware AI companion designed to understand your screen and assist you with any task.

## 🚀 Quick Start Guide

### Prerequisites

* Make sure you have Node.js installed on your computer.
* Git installed on your computer.
* A Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey)).

### Installation Steps

1.  Clone the repository:
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    * Create a file named `.env` in the root folder.
    * Add your Gemini API key:
        ```
        GEMINI_API_KEY=your_api_key_here
        ```
    * Save the file.

### Running the App

The easiest way to run the app in development mode is with a single command:
```bash
npm run app:dev
```
This command starts the Vite development server and launches the Electron app simultaneously.

Alternatively, you can build the application for production:
```bash
npm run app:build
```
The installable application will be located in the `release` folder.

### ⚠️ Important Notes

1.  **Closing the App**:
    * Press `Cmd + Q` (Mac) or `Ctrl + Q` (Windows/Linux) to quit.
    * Or use Activity Monitor/Task Manager to close the process.
    * The X button currently doesn't work (known issue).

2.  **Keyboard Shortcuts**:
    * `Cmd/Ctrl + B`: Toggle window visibility
    * `Cmd/Ctrl + H`: Take screenshot (This is how you give context to the AI)
    * `Cmd + Enter`: Get solution/response
    * `Cmd/Ctrl + Arrow Keys`: Move window

### Troubleshooting

If you encounter errors during setup or runtime:
1.  Delete the `node_modules` folder.
2.  Delete the `package-lock.json` file.
3.  Run `npm install` again.
4.  Try running the app again using `npm run app:dev`.

## 🔮 Future Vision & Roadmap

The current version is just the beginning. The ultimate goal is to evolve beyond a reactive, screenshot-based tool into a truly proactive AI companion.

The roadmap includes:
* **Continuous Screen Awareness**: Moving towards a model that is always aware of your screen context, allowing it to offer help without needing a manual screenshot.
* **Proactive Suggestions**: Suggesting solutions, commands, or information based on the application you're using and the task you're performing.
* **Deeper OS Integration**: Exploring ways to interact more deeply with the operating system to provide a more seamless assistance experience.

## 🤝 Contribution

This is an open-source project driven by a vision for a more helpful computing experience. While I can't actively maintain it day-to-day, contributions are highly encouraged and welcome.

If you have ideas, bug fixes, or features that align with the project's vision, please feel free to open a Pull Request. I will review and merge contributions as they come in.
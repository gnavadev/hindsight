export const OSRSTheme = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=RuneScape+UF&display=swap');

    /* Container background */
    .osrs-container {
      color:  #ffff11;
      font-family: 'RuneScape UF', sans-serif;
      background-color: #c8b997; /* parchment base */
      border: 2px solid #2e2b21; /* outer border */
      box-shadow:
        inset 0 0 0 3px #5a4a3a,
        inset 0 0 0 4px #000,
        inset 0 0 0 7px #5a4a3a;
      text-shadow: 2px 1px 1px #000000;  
      font-size: 16px;
      padding: 16px;
    }

    /* Headers */
    .osrs-header {
      color: #ffffff;
      text-shadow: 2px 1px 1px #000000;  
      font-size: 16px;
      margin-bottom: 8px;
    }

    /* Body text */
    .osrs-content, .osrs-content p, .osrs-content strong {
      font-size: 16px;
    }

    /* Code block */
    .osrs-code-block {
      background-color: #000 !important;
      border: 2px solid #333;
      font-family: monospace !important;
      text-shadow: none;
    }

    /* Multiple-choice block */
    .osrs-mcq-block {
      background-color: rgba(0, 0, 0, 0.1);
      border: 2px solid #5a4a3a;
      padding: 8px;
      margin-top: 4px;
      border-radius: 4px;
    }
    .osrs-mcq-block h3 {
      color: #000;
      font-weight: bold;
    }
    .osrs-mcq-block p {
      color:  #ffff11;
      text-shadow: 2px 1px 1px #000000;  
      font-size: 16px;
    }

    /* Toolbar buttons (CTRL, B, H, etc.) */
    .osrs-toolbar-btn {
      background-color: #b89f6b; /* golden brown */
      border: 2px solid #5a4a3a;
      color: rgba(255, 255, 255, 0.7);
      padding: 2px 6px;
      font-size: 0.75rem;
      box-shadow: inset 0 1px 0 #e3d3a4; /* highlight */
      text-shadow: 2px 1px 1px #000000;  
      cursor: help;
    }

    /* Toolbar container background */
    .osrs-toolbar {
      background-color: #c8b997;
      border: 2px solid #5a4a3a;
      padding: 4px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tooltip bubble */
    .osrs-tooltip {
      background-color: #c8b997;
      border: 2px solid #5a4a3a;
      color: #000;
      padding: 6px;
      font-size: 16px;
      border-radius: 4px;
    }

    /* Theme toggle button */
    .osrs-button {
      background-color: #b89f6b;
      border: 2px solid #5a4a3a;
      color: #ffffff;
      padding: 4px 8px;
      font-size: 14px;
      border-radius: 4px;
      box-shadow: inset 0 1px 0 #e3d3a4;
      text-shadow: 2px 1px 1px #000000;  
      cursor: pointer;
    }
    .osrs-button:hover {
      background-color: #d4ba82;
    }

    /* Quit button (red) */
    .osrs-quit {
      background-color: #8b2e2e;
      border: 2px solid #5a4a3a;
      color: #fff;
      font-weight: bold;
      padding: 2px 6px;
      font-size: 11px;
      border-radius: 2px;
      cursor: pointer;
    }
    .osrs-quit:hover {
      background-color: #a63a3a;
    }
  `}</style>
);
export default OSRSTheme;

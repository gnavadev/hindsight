const OsrsTheme = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=RuneScape+UF&display=swap');

    .osrs-container {
      font-family: 'RuneScape UF', sans-serif;
      background-color: #c8b997; /* Base parchment color */
      
      /* Recreating the iconic double border with multiple box-shadows */
      border: 2px solid #2e2b21; /* Outermost dark line */
      box-shadow: 
        inset 0 0 0 3px #5a4a3a,  /* Inner dark brown border */
        inset 0 0 0 4px #000,      /* Inner black line */
        inset 0 0 0 7px #5a4a3a;  /* Inner shadow effect */

      color: #000000;
      text-shadow: none;
      padding: 16px;
    }
    .osrs-header {
      color: #000000; /* Black text for headers */
      font-size: 16px;
      margin-bottom: 8px;
    }
    .osrs-content, .osrs-content p, .osrs-content strong {
      color: #000000; /* Black text for content for better readability */
      font-size: 16px;
      text-shadow: none;
    }
    .osrs-code-block {
      background-color: #000000 !important;
      border: 2px solid #333;
      font-family: monospace !important;
      text-shadow: none;
    }
    .osrs-mcq-block {
        background-color: rgba(0, 0, 0, 0.1);
        border: 2px solid #5a4a3a;
        padding: 8px;
        margin-top: 4px;
        border-radius: 4px;
    }
    .osrs-mcq-block h3 {
        color: #000000;
        font-weight: bold;
    }
    .osrs-mcq-block p {
        color: #000000;
    }
  `}</style>
);

export default OsrsTheme;
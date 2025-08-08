import { useTheme } from "../../contexts/ThemeContext";

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={
        theme === "osrs"
          ? "osrs-button px-3 py-1"
          : "bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded"
      }
    >
      {theme === "osrs" ? "Theme1" : "Theme2"}
    </button>
  );
};

export default ThemeToggleButton;

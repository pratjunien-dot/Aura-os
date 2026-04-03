import { useState, useEffect } from "react";

export const useDecrypt = (text: string, speed = 40) => {
  const [display, setDisplay] = useState("");
  const chars = "!<>-_\\/[]{}—=+*^?#________";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplay(
          (prev) =>
            text.substring(0, i) +
            chars[Math.floor(Math.random() * chars.length)],
        );
        i++;
      } else {
        setDisplay(text);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return display;
};

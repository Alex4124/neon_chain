import { NeonChainGame } from "./Game";
import "./styles.css";

document.addEventListener("DOMContentLoaded", () => {
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    new NeonChainGame(gameContainer);
  }
});

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const TIEMPO_INACTIVIDAD = 25 * 60 * 1000; // 25 minutos

export default function SessionTimeout({ children }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const cerrarSesion = () => {
    localStorage.clear();
    alert("Sesión cerrada por inactividad.");
    navigate("/");
  };

  const reiniciarTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      cerrarSesion();
    }, TIEMPO_INACTIVIDAD);
  };

  useEffect(() => {
    const eventos = [
      "mousemove",
      "mousedown",
      "keydown",
      "click",
      "scroll",
      "touchstart"
    ];

    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTimer);
    });

    reiniciarTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTimer);
      });
    };
  }, []);

  return children;
}
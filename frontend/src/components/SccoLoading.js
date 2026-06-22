import React from "react";

const spinStyle = {
  width: "18px",
  height: "18px",
  border: "3px solid #d8e7df",
  borderTop: "3px solid #1f7a4d",
  borderRadius: "50%",
  animation: "scco-spin 0.8s linear infinite"
};

const overlayKeyframes = `
@keyframes scco-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

function Spinner({ size = 18 }) {
  return (
    <>
      <style>{overlayKeyframes}</style>
      <span
        style={{
          ...spinStyle,
          width: `${size}px`,
          height: `${size}px`
        }}
      />
    </>
  );
}

export function SccoInlineLoading({ message = "Procesando..." }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <Spinner size={14} />
      <span>{message}</span>
    </span>
  );
}

export function SccoSectionLoading({ message = "Cargando..." }) {
  return (
    <div style={sectionBox}>
      <Spinner size={32} />
      <div style={{ fontWeight: 700, color: "#175f3c", fontSize: "15px" }}>{message}</div>
    </div>
  );
}

const sectionBox = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  padding: "60px 20px"
};

export function SccoPageLoading({ message = "Cargando..." }) {
  return (
    <div style={overlay}>
      <div style={box}>
        <Spinner size={28} />
        <div style={{ fontWeight: 700, color: "#175f3c" }}>{message}</div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(239, 246, 242, 0.85)",
  backdropFilter: "blur(2px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const box = {
  background: "white",
  borderRadius: "12px",
  border: "1px solid #cfe2d6",
  padding: "20px 24px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  boxShadow: "0 10px 30px rgba(10, 60, 35, 0.15)"
};

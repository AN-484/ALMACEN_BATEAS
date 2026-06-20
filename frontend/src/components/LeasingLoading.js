import React from "react";

const spinFrames = `
@keyframes leasing-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

export function LeasingPageLoading({ message = "Cargando..." }) {
  return (
    <div style={pageWrap}>
      <style>{spinFrames}</style>
      <div style={spinnerLg}></div>
      <p style={text}>{message}</p>
    </div>
  );
}

export function LeasingInlineLoading({ message = "Cargando..." }) {
  return (
    <span style={inlineWrap}>
      <style>{spinFrames}</style>
      <span style={spinnerSm}></span>
      <span>{message}</span>
    </span>
  );
}

const pageWrap = {
  minHeight: 220,
  display: "grid",
  placeItems: "center",
  gap: 12,
  background: "linear-gradient(180deg, rgba(124,58,237,0.05), rgba(76,29,149,0.02))",
  border: "1px solid #e9ddff",
  borderRadius: 16,
  padding: 24
};

const spinnerBase = {
  borderStyle: "solid",
  borderRadius: "50%",
  borderColor: "#d7c3ff",
  borderTopColor: "#6d28d9",
  animation: "leasing-spin 0.85s linear infinite"
};

const spinnerLg = {
  ...spinnerBase,
  width: 42,
  height: 42,
  borderWidth: 4
};

const spinnerSm = {
  ...spinnerBase,
  width: 14,
  height: 14,
  borderWidth: 2
};

const text = {
  margin: 0,
  color: "#4c1d95",
  fontWeight: 700
};

const inlineWrap = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700
};

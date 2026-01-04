import React from "react";
import { Box } from "@mui/material";

export default function LubricanteGearsLoader({
  size = 90,
  dropColor = "#F5C542",
  gearColor = "#4B5563",
  speed = 1,
}) {
  const duration = 4 / speed; // seconds

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Engranaje Izquierdo */}
        <g
          style={{
            transformOrigin: "40px 70px",
            animation: `gearLeft ${duration}s linear 30 forwards`,
          }}
        >
          <path
            d="M40 50 L48 52 L54 46 L60 52 L68 50 L70 58 L78 60 L76 68 L82 74 L76 80 L78 88 L70 90 L68 98 L60 96 L54 102 L48 96 L40 98 L38 90 L30 88 L32 80 L26 74 L32 68 L30 60 L38 58 Z"
            fill={gearColor}
          />
        </g>

        {/* Engranaje Derecho */}
        <g
          style={{
            transformOrigin: "80px 70px",
            animation: `gearRight ${duration}s linear 30 forwards`,
          }}
        >
          <path
            d="M80 50 L88 52 L94 46 L100 52 L108 50 L110 58 L118 60 L116 68 L122 74 L116 80 L118 88 L110 90 L108 98 L100 96 L94 102 L88 96 L80 98 L78 90 L70 88 L72 80 L66 74 L72 68 L70 60 L78 58 Z"
            fill={gearColor}
          />
        </g>

        {/* Gota */}
        <g
          style={{
            transformOrigin: "60px 20px",
            animation: `dropFall ${duration}s linear 30 forwards`,
          }}
        >
          <path
            d="M60 10 C55 18, 50 26, 50 32 C50 42, 56 48, 60 48 C64 48, 70 42, 70 32 C70 26, 65 18, 60 10 Z"
            fill={dropColor}
            style={{
              animation: `dropFade ${duration}s linear 30 forwards`,
            }}
          />
        </g>

        {/* Animaciones */}
        <style>{`
          @keyframes gearLeft {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes gearRight {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes dropFall {
            0%   { transform: translateY(0px); }
            40%  { transform: translateY(42px); }
            60%  { transform: translateY(42px) scale(0.85); }
            100% { transform: translateY(0px); }
          }
          @keyframes dropFade {
            0%   { opacity: 1; }
            45%  { opacity: 1; }
            60%  { opacity: 0; }
            100% { opacity: 0; }
          }
        `}</style>
      </svg>
    </Box>
  );
}

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default {
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
};
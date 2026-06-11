// vite.config.ts
import { defineConfig } from "file:///D:/projects/InterviewAssist/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/projects/InterviewAssist/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "/interview_assist/",
  server: {
    port: 8189,
    host: "0.0.0.0",
    proxy: {
      "/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/resume": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/candidate": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/notification": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/user": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
            return "/interview_assist/index.html";
          }
        }
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFxJbnRlcnZpZXdBc3Npc3RcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHByb2plY3RzXFxcXEludGVydmlld0Fzc2lzdFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovcHJvamVjdHMvSW50ZXJ2aWV3QXNzaXN0L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgYmFzZTogJy9pbnRlcnZpZXdfYXNzaXN0LycsXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDgxODksXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FkbWluJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9hdXRoJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9yZXN1bWUnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgYnlwYXNzOiAocmVxKSA9PiB7XG4gICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmFjY2VwdCAmJiByZXEuaGVhZGVycy5hY2NlcHQuaW5kZXhPZignaHRtbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICcvaW50ZXJ2aWV3X2Fzc2lzdC9pbmRleC5odG1sJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAnL2NhbmRpZGF0ZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICcvbm90aWZpY2F0aW9uJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy91c2VyJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1MsU0FBUyxvQkFBb0I7QUFDblUsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsRUFDTixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxVQUFVO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGNBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixjQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFdBQVc7QUFBQSxRQUNULFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVEsQ0FBQyxRQUFRO0FBQ2YsY0FBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGNBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsaUJBQWlCO0FBQUEsUUFDZixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGNBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixjQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNWLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

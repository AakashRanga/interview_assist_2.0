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
      "/feedback": {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFxJbnRlcnZpZXdBc3Npc3RcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHByb2plY3RzXFxcXEludGVydmlld0Fzc2lzdFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovcHJvamVjdHMvSW50ZXJ2aWV3QXNzaXN0L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgYmFzZTogJy9pbnRlcnZpZXdfYXNzaXN0LycsXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDgxODksXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FkbWluJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9hdXRoJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9yZXN1bWUnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgYnlwYXNzOiAocmVxKSA9PiB7XG4gICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmFjY2VwdCAmJiByZXEuaGVhZGVycy5hY2NlcHQuaW5kZXhPZignaHRtbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICcvaW50ZXJ2aWV3X2Fzc2lzdC9pbmRleC5odG1sJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAnL2NhbmRpZGF0ZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICcvbm90aWZpY2F0aW9uJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9mZWVkYmFjayc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICcvdXNlcic6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICcvdXBsb2Fkcyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQXNTLFNBQVMsb0JBQW9CO0FBQ25VLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBLEVBQ04sUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsVUFBVTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixjQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVEsQ0FBQyxRQUFRO0FBQ2YsY0FBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGNBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsY0FBYztBQUFBLFFBQ1osUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixjQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixjQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLGFBQWE7QUFBQSxRQUNYLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVEsQ0FBQyxRQUFRO0FBQ2YsY0FBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGNBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

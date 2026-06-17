// vite.config.ts
import { defineConfig, loadEnv } from "file:///D:/projects/InterviewAssist/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/projects/InterviewAssist/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_API_BASE_URL || "http://localhost:8000";
  return {
    plugins: [react()],
    base: "/",
    server: {
      port: 8189,
      host: "0.0.0.0",
      proxy: {
        "/admin": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/auth": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/resume": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/candidate": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/notification": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/feedback": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/user": {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
              return "/interview_assist/index.html";
            }
          }
        },
        "/uploads": {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFxJbnRlcnZpZXdBc3Npc3RcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHByb2plY3RzXFxcXEludGVydmlld0Fzc2lzdFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovcHJvamVjdHMvSW50ZXJ2aWV3QXNzaXN0L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gIGNvbnN0IGJhY2tlbmRVcmwgPSBlbnYuVklURV9BUElfQkFTRV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCc7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgYmFzZTogJy8nLFxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogODE4OSxcbiAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYWRtaW4nOiB7XG4gICAgICAgICAgdGFyZ2V0OiBiYWNrZW5kVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICcvaW50ZXJ2aWV3X2Fzc2lzdC9pbmRleC5odG1sJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICcvYXV0aCc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGJhY2tlbmRVcmwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmFjY2VwdCAmJiByZXEuaGVhZGVycy5hY2NlcHQuaW5kZXhPZignaHRtbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJy9yZXN1bWUnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBiYWNrZW5kVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBieXBhc3M6IChyZXEpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5hY2NlcHQgJiYgcmVxLmhlYWRlcnMuYWNjZXB0LmluZGV4T2YoJ2h0bWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICcvaW50ZXJ2aWV3X2Fzc2lzdC9pbmRleC5odG1sJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICcvY2FuZGlkYXRlJzoge1xuICAgICAgICAgIHRhcmdldDogYmFja2VuZFVybCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgYnlwYXNzOiAocmVxKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnL25vdGlmaWNhdGlvbic6IHtcbiAgICAgICAgICB0YXJnZXQ6IGJhY2tlbmRVcmwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmFjY2VwdCAmJiByZXEuaGVhZGVycy5hY2NlcHQuaW5kZXhPZignaHRtbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJy9mZWVkYmFjayc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGJhY2tlbmRVcmwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIGJ5cGFzczogKHJlcSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcS5oZWFkZXJzLmFjY2VwdCAmJiByZXEuaGVhZGVycy5hY2NlcHQuaW5kZXhPZignaHRtbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICByZXR1cm4gJy9pbnRlcnZpZXdfYXNzaXN0L2luZGV4Lmh0bWwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJy91c2VyJzoge1xuICAgICAgICAgIHRhcmdldDogYmFja2VuZFVybCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgYnlwYXNzOiAocmVxKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYWNjZXB0ICYmIHJlcS5oZWFkZXJzLmFjY2VwdC5pbmRleE9mKCdodG1sJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnL2ludGVydmlld19hc3Npc3QvaW5kZXguaHRtbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnL3VwbG9hZHMnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBiYWNrZW5kVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzUyxTQUFTLGNBQWMsZUFBZTtBQUM1VSxPQUFPLFdBQVc7QUFHbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sYUFBYSxJQUFJLHFCQUFxQjtBQUU1QyxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakIsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsVUFBVTtBQUFBLFVBQ1IsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixnQkFBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLHFCQUFPO0FBQUEsWUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsUUFDQSxTQUFTO0FBQUEsVUFDUCxRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGdCQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFdBQVc7QUFBQSxVQUNULFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFFBQVEsQ0FBQyxRQUFRO0FBQ2YsZ0JBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsY0FBYztBQUFBLFVBQ1osUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixnQkFBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLHFCQUFPO0FBQUEsWUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsUUFDQSxpQkFBaUI7QUFBQSxVQUNmLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFFBQVEsQ0FBQyxRQUFRO0FBQ2YsZ0JBQUksSUFBSSxRQUFRLFVBQVUsSUFBSSxRQUFRLE9BQU8sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUNuRSxxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsYUFBYTtBQUFBLFVBQ1gsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUSxDQUFDLFFBQVE7QUFDZixnQkFBSSxJQUFJLFFBQVEsVUFBVSxJQUFJLFFBQVEsT0FBTyxRQUFRLE1BQU0sTUFBTSxJQUFJO0FBQ25FLHFCQUFPO0FBQUEsWUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsUUFDQSxTQUFTO0FBQUEsVUFDUCxRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRLENBQUMsUUFBUTtBQUNmLGdCQUFJLElBQUksUUFBUSxVQUFVLElBQUksUUFBUSxPQUFPLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDbkUscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFlBQVk7QUFBQSxVQUNWLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

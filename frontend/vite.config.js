import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    icons: ['lucide-react']
                }
            }
        },
        chunkSizeWarningLimit: 1000
    },
    esbuild: {
        drop: ['console', 'debugger'],
    }
})

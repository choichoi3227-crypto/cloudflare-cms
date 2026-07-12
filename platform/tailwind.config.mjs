// platform/tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412',900:'#7c2d12' },
        surface: { 50:'#fafafa',100:'#f5f5f5',200:'#e5e5e5',300:'#d4d4d4',400:'#a3a3a3',500:'#737373',600:'#525252',700:'#404040',800:'#262626',900:'#171717',950:'#0a0a0a' },
      },
      fontFamily: { sans: ['Pretendard','system-ui','sans-serif'], mono: ['JetBrains Mono','monospace'] },
      animation: { 'fade-in':'fadeIn 0.5s ease-out', 'slide-up':'slideUp 0.5s ease-out' },
      keyframes: { fadeIn:{ '0%':{opacity:'0'},'100%':{opacity:'1'} }, slideUp:{ '0%':{opacity:'0',transform:'translateY(20px)'},'100%':{opacity:'1',transform:'translateY(0)'} } },
    },
  },
};

import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['code.ts'],
  bundle: true,
  outfile: 'code.js',
  platform: 'browser',          // 브라우저 환경으로 설정
  target: 'es6',                // ES6 호환
  minify: true,
  sourcemap: 'inline',
  external: [],                 // 필요 시 외부 의존성 추가
}).catch(() => process.exit(1));
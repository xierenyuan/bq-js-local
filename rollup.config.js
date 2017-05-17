import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import replace from 'rollup-plugin-replace'

const isProduction = process.env.NODE_ENV === 'production'

export default {
  entry: 'src/index.js',
  format: 'iife',
  moduleName: 'bqLocal',
  plugins: [
    replace({
      'process.browser' : true
    }),
    resolve({
    customResolveOptions: {
      moduleDirectory: 'node_modules'
    }}),
    babel({
      plugins: ['external-helpers'],
      exclude: 'node_modules/**'
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    (isProduction && uglify()),
    (!isProduction && serve({
     open: true,
     contentBase: ['examples/', 'dist/'],   //启动文件夹;
      host: 'localhost',      //设置服务器;
      port: 9999             //端口号;
    })),

    (!isProduction && livereload({
      watch: 'dist/'   //监听文件夹;
    }))
  ],
  dest:isProduction ? 'dist/index.min.js' : 'dist/index.js',
  sourceMap: !isProduction
}

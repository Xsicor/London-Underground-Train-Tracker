const path = require("path");

module.exports = {
  mode: 'development',
  entry: "./src/Main.js", // path to our input file
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js']
  },
  devtool: 'inline-source-map',
  watch: true,
  output: {
    filename: "bundle.js", // output bundle file name
    path: path.resolve(__dirname, "./map/static/map"), // path to Django static directory
  }
};

var gulp = require('gulp'),
  gutil = require('gulp-util'),
  uglify = require('gulp-uglify'),
  minify = require('gulp-minify-css'),
  plumber = require('gulp-plumber'),
  config = require('../config'),
  gzip = require('gulp-gzip'),
  handleErrors = require('../util/handleErrors');

gulp.task('copy', function() {
  gulp.src([config.sourceAssetsDir + 'js/lib/**'])
    .pipe(plumber())
    .pipe(gulp.dest(config.buildAssetsDir + 'js/lib/'));

  gulp.src(config.buildAssetsDir + 'js/bundle.js')
    .pipe(plumber())
    .pipe(uglify())
    .pipe(gulp.dest(config.buildAssetsDir + 'js/'));

  gulp.src(config.buildAssetsDir + 'css/main.css')
    .pipe(plumber())
    .pipe(minify())
    .pipe(gulp.dest(config.buildAssetsDir + 'css/'));

  gulp.src(config.sourceAssetsDir + 'fonts/*')
    .pipe(plumber())
    .pipe(gulp.dest(config.buildAssetsDir + 'fonts/'));

  gulp.src(config.buildAssetsDir + 'img/*')
    .pipe(plumber())
    .pipe(gulp.dest(config.buildAssetsDir + 'img/'));

  gulp.src(config.buildAssetsDir + '*.html')
    .pipe(plumber())
    .pipe(gulp.dest(config.buildDir));
});

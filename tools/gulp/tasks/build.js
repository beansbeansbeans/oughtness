var gulp = require('gulp'),
  gutil = require('gulp-util'),
  runSequence = require('run-sequence');

var buildComplete = function() {
  gutil.log(gutil.colors.green('[ ...BUILD COMPLETE ]'));
};

gulp.task('build', function() {
  gutil.log(gutil.colors.green('[ STARTING BUILD... ]'));
  runSequence('clean', 'scripts', 'sass', 'images', 'markup', 'copy', buildComplete);
});

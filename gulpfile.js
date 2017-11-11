const gulp = require('gulp');
const less = require('gulp-less');

gulp.task('less', function(){
    gulp.src('./css/style.less')
    .pipe(less())
    .pipe(gulp.dest('./css'))
});

gulp.task('watch', function(){
    gulp.watch('./css/style.less', ['less'])
});
  
gulp.task('default', ['less']);
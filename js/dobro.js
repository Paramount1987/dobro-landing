var count = 0;
var countSaver = 0;

var idInterval = 0;
var reset = 0;


function countLoop(){
  if(count >= 1700){
    count = 0;
  }else{
    count += 100;
  }
}



$(window).on('load', function () {



    var preloader = $('#page-preloader'),
        spinner   = preloader.find('.spinner');
    spinner.fadeOut();
    preloader.fadeOut('slow');
});


$(document).ready(function(){

  $(document).scrollTop(0);
  new WOW().init();
 
     
// $(".boy-block").mouseover(function(){

//     clearTimeout(reset);
    
//     if($(".circle-inner").hasClass("active")){
//       setTimeout('clearInterval(idInterval);', 1700 - countSaver)
//     }else{
//       count = 0;
//       idInterval = setInterval(countLoop,100); 
//       $(".circle-inner").addClass("active");
//     }


// });

// $(".boy-block").mouseleave(function(){   
//       countSaver = count;
//       reset =  setTimeout( '$(".circle-inner").removeClass("active");clearInterval(idInterval);count = 0;', 1700 - count);
// });

setInterval('if($(".circle-inner").hasClass("active")){$(".circle-inner").removeClass("active")}else{$(".circle-inner").addClass("active")}',2500);
///////////
var scene = document.getElementById('scene');
var parallax = new Parallax(scene, {
  frictionX: 0
});


});


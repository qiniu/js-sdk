/*global hljs */


$(function() {
    $('#js-navbar-nav').find('li').each(function() {
        if (location.pathname === $(this).find('a').attr('href')) {
            $(this).addClass('active').siblings().removeClass('active');
            return;
        }
    })

    $('pre code').each(function(i, e) {
        hljs.highlightBlock(e);
    });

});

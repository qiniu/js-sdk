$(function() {
    $.ajax({
        url: '/uptoken'
    }).done(function(obj) {
        console.log('========>token:', obj);
        console.log('========>token val:', obj.uptoken);
        $('#form-token').val(obj.uptoken);
        var tk = document.getElementById('form-token');
        console.log('=========>>', tk);
        tk.value = obj.uptoken;
    });
});

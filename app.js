$(document).ready(function () {
    // When the input field is focused
    $('.form-control').focus(function () {
        $(this).siblings('.form-label').addClass('active');
    });

    // When the input field is blurred
    $('.form-control').blur(function () {
        if ($(this).val() === '') {
            $(this).siblings('.form-label').removeClass('active');
        }
    });
});

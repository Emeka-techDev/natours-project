export const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
}

// type is 'success' or 'failed'
export const showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--type__${type}> ${msg} </div>`
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 5000);
}
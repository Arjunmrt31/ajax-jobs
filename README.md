# Ajax-Jobs
Ever need to looping to perform actions on multiple data. Ajax-jobs make your task easy.

Ajax-Jobs is jQuery plugin to performs batch jobs by ajax.

# Features
- Display process in Botstrap Modal
- Display progressbar
- Flexible 
- Can be defined directely on HTML element using ```data``` attribute

# Getting Start
> To start using it, Just add the plugin into your project and bind the method with HTML Element.
# Dependencies 
> Ajax-Jobs have several dependencies
- It requires jQuery
- It requires Bootstrap - for modal
- It requires Sweet Alert - for alerts
By default these are included using ```import```

Further to process next job it require ```var totalCount``` in response. If your server return something else for example ```count``` , you need to bind ```onJobComplete``` and modify response data in the required format.
# Configurations 
> You can configure the below default values 
```
    var ajaxJobsDefaults = {    
        modalId: "ajax-jobs-modal",
        ajaxUrl: '',
        isForm:false,
        limit:10,     
        delay: '200',//ms
        locale: {
            title: 'Processing Task',
            close_btn: 'Close',
            loading_text: '0%',
            processing_job: 'Processing page ',
            message_handle: 'Message ',
            cancel_job_close_modal: 'Task is in progress, Do you want to cancel current task?',
            are_you_sure: 'Are You Sure?',
            ok_btn: 'Confirm',
            cancel_btn: 'Cancel'
        }, 
        onInit: function () { },
        onJobInit: function () { },
        onJobComplete: function () { },
        onFinalize: function () { },
        onBeforeSend: function () { },
        onAjaxError: function () { },
        onBeforeModalDisplay: function () { },
        onBeforeRun: function () { },
    };
 ```  
# Examples
- Simple example using locale
```
$("#sync-order").ajaxJobs({
    ajaxUrl: $("#sync-order").attr('data-href'),
    locale: {
        title: 'Send Batch Messages',
        close_btn: 'Close',
        processing_job: ' Processing page ',
        message_handle: 'Message',
        cancel_job_close_modal: 'Task is in progress, Do you want to cancel current task?',
        are_you_sure: 'Are you sure?',
        ok_btn: 'Ok',
        cancel_btn: 'Cancel'
    },
});
```
- Perform some validation before processing
```
$(".send_marketing_sms").ajaxJobs({
    ajaxUrl: 'marketmessages',
    onBeforeRun: function(modal) {
        var text = $('#custom_form_marketing_alert_sms').val();
        if (!text.trim()) {
            swal("", "Marketing SMS text cannot be Blank", "error");
            return false;
        }
        return true;
    }
});
```



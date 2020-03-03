/**
* @version: 0.0.1
* @author: Arjun Singh
* @copyright: Webkul Software https://webkul.com. All rights reserved.
* @license: Licensed under the GPL 2.0
*/

'use strict';

import $ from 'jquery';
import 'bootstrap';
import swal from 'sweetalert';

(function (factory) {
    "use strict";
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["jquery"], factory);
    } else if (typeof exports !== "undefined") {
        module.exports = factory(require("jquery"));
    } else {
        // Browser globals
        factory(window.jQuery);
    }
}(function ($) {
    "use strict";
    var pluginName = "ajaxJobs";
    var ajaxJobslocale = {
        title: 'Processing Task',
        close_btn: 'Close',
        loading_text: '0%',
        processing_job: 'Processing page ',
        message_handle: 'Message ',
        cancel_job_close_modal: 'Task is in progress, Do you want to cancel current task?',
        are_you_sure: 'Are You Sure?',
        ok_btn: 'Confirm',
        cancel_btn: 'Cancel'
    }
    // These are the plugin defaults values
    var ajaxJobsDefaults = {
        modalId: "ajax-jobs-modal",
        ajaxUrl: '',
        isForm: false,
        data: {},
        dataBatchSize: 0,
        limit: 10,
        delay: '200',//ms
        locale: {},
        onInit: function () { },
        onJobInit: function () { },
        onJobComplete: function () { },
        onFinalize: function () { },
        onBeforeSend: function () { },
        onAjaxError: function () { },
        onBeforeModalDisplay: function () { },
        onBeforeRun: function () { },
    };


    var ajaxJobs = function (element, options) {
        this.element = $(element);
        this.settings = $.extend({}, ajaxJobsDefaults, options);
        this.locale = $.extend({}, ajaxJobslocale, this.settings.locale);

        if (!this.checkSupport()) {
            $.error("Browser not supported by jQuery.ajaxJobs");
            this.settings.onFallbackMode.call(this.element);
            return false;
        }
        this.init();
        return this;
    };

    ajaxJobs.prototype.checkSupport = function () {
        // This one is mandatory for all modes
        return true;
    };

    ajaxJobs.prototype.init = function () {
        var widget = this;
        this.active = false;
        this.queue = {};
        this.formData = new FormData();
        this.current = 0;
        this.totalCount = 0;
        this.isValid = true;
        this.modalReference = null;
        this.progressBarContainer = null;
        this.progressBarValueContainer = null;
        this.progressBarCaptionContainer = null;
        this.settings.onInit.call(this.element);
        this.addJobsModal();
        this.bindEvents();
        return this;
    };
    ajaxJobs.prototype.addJobsModal = function () {
        var widget = this;
        if ($("#" + this.settings.modalId).length <= 0) {
            //add modal to body if not already attached
            var modal = '<div class="modal fade" id="' + this.settings.modalId + '" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static" data-keyboard="false">\
                <div class="modal-dialog modal-xl full-width" role="document">\
                    <div class="modal-content">\
                        <div class="modal-header">\
                            <h5 class="modal-title" id="ajax-modal-title">'+ this.locale.title + '</h5>\
                            <button type="button" class="close close-jobs-modal" aria-label="Close">\
                                <span aria-hidden="true">&times;</span>\
                            </button>\
                        </div>\
                        <div class="modal-body ajaxjobs-main-container">\
                            \<div id="ajax-jobs-progressbar-container" class="progress active">\
                                <div class="ajax-jobs-progressbar-value progress-bar">\
                                    <span class="ajax-jobs-progressbar-caption ajax-jobs-caption-light" >\
                                    '+ this.locale.loading_text + '\
                                    </span >\
                                </div>\
                            </div >\
                            <div class="ajaxjobs-jobs-container">\
                            </div>\
                        </div>\
                        <div class="modal-footer">\
                            <button type="button" class="btn btn-secondary close-jobs-modal">\
                                '+ this.locale.close_btn + '\
                            </button>\
                        </div>\
                    </div>\
                </div>\
            </div>';
            $('body').append(modal);
        }
        this.modalReference = $('body').find("#" + this.settings.modalId);
        this.progressBarContainer = $(this.modalReference).find('#ajax-jobs-progressbar-container');
        this.progressBarValueContainer = $(this.progressBarContainer).find('.ajax-jobs-progressbar-value');
        this.progressBarCaptionContainer = $(this.progressBarContainer).find('.ajax-jobs-progressbar-caption');
    };
    ajaxJobs.prototype.modalShow = function () {
        var response = this.settings.onBeforeModalDisplay.call(this.element, this.modalReference);
        if (response !== false) {
            // set plugin specific modal data 
            $(this.modalReference).find(".modal-title").html(this.locale.title);
            $(this.modalReference).find("btn.close-jobs-modal").html(this.locale.close_btn);
            $(this.modalReference).modal('show');
        }
    };
    ajaxJobs.prototype.bindEvents = function () {
        var widget = this;
        if (widget.settings.isForm) { // onsubmit form
            $(widget.element).on('submit', function (e) {
                e.preventDefault();
                //reset jobs
                widget.resetJobs();
                // widget.formData = $(this).serialize();
                widget.formData = new FormData(this);
                //trigger modal 
                widget.modalShow();
                widget.processJobs();
                return false;
            });
        } else { // click
            $(widget.element).on('click', function (e) {
                e.preventDefault();
                //reset jobs
                widget.resetJobs();
                //trigger event before display modal or process job 
                var response = widget.settings.onBeforeRun.call(this.element, this.modalReference);

                if (response !== false) {
                    //trigger modal 
                    widget.modalShow();
                    widget.processJobs();
                }
                return false;
            });
        }
        // bind message toggle 
        $('body').on("click", '.ajaxjobs-message-toggle', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation(); //prevent other listners to fire 
            var messageId = $(this).attr('data-messageid');
            $("#ajax-jobs-messages-" + messageId).slideToggle(300);
        });
        // bind modal close 
        $('body').on("click", '.close-jobs-modal', function (e) {
            e.preventDefault();
            if (!widget.active) { // there may be multiple plyugins on same page : each will trigger onclick
                return false;
            }
            //e.stopImmediatePropagation(); //prevent other listners to fire ;
            // on modal close confirm and cancel jobs
            if (Object.keys(widget.queue).length) {
                swal({
                    title: widget.locale.cancel_job_close_modal,
                    text: widget.locale.are_you_sure,
                    icon: "warning",
                    buttons: [widget.locale.cancel_btn, widget.locale.ok_btn],
                    dangerMode: true,
                }).then((allow) => {
                    if (allow) {
                        for (var k in widget.queue) {
                            if (widget.queue.hasOwnProperty(k)) {
                                widget.queue[k].abort();
                            }
                        }
                        //cancel job
                        widget.isValid = false;
                        $(widget.modalReference).modal('hide');
                        widget.active = false;
                    }
                });
            } else {
                $(widget.modalReference).modal('hide');
            }
            return false;
        });
    };
    ajaxJobs.prototype.resetJobs = function () {
        //no processed page
        this.queue = {};
        this.current = 0;
        this.isValid = true;
        // reset progressbar
        this.updateProgressbar();
        //reset modal content
        $(".ajaxjobs-jobs-container").empty();
    };
    ajaxJobs.prototype.processJobs = function () {
        var widget = this;
        widget.active = true;
        widget.current++; //increment page 
        if (widget.settings.ajaxUrl && widget.isValid) {
            var currentStart = (widget.current - 1) * widget.settings.limit;
            var currentBatch = currentStart + widget.settings.limit;
            if (widget.totalCount && currentBatch > widget.totalCount) {
                currentBatch = widget.totalCount;
            }

            //add job start message
            var jobMessage = $("<div clas='ajaxjobs-job-container' id='ajaxjobs-job-" + widget.current + "'>\
                <div class='ajaxjobs-job-status'>\
                    <i class='fa fa-spinner fa-spin' />\
                </div>\
                <div class='ajax-jobs-job-title'>\
                    "+ widget.locale.processing_job + widget.current + " (" + currentStart + " - " + currentBatch + ")" + "\
                </div>\
                \
            </div>");
            $(widget.modalReference).find('.ajaxjobs-jobs-container').append(jobMessage);
            // configure ajax data for form type 

            widget.formData.append('limit', widget.settings.limit);
            widget.formData.append('page', widget.current);

            // make call to server 
            widget.queue['job-' + widget.current] = $.ajax({
                url: widget.settings.ajaxUrl,
                method: "POST",
                data: widget.formData,
                processData: false,/* to use FormData */
                contentType: false,
                cache: false,
                dataType: 'json',
                beforeSend: function () {
                    widget.settings.onBeforeSend.call(widget.element);
                },
                success: function (response) {
                    if (response.totalCount) {
                        widget.totalCount = response.totalCount;
                    }
                    // add job complete message 
                    if (response.notifications) {
                        widget.addMessageToJob(response.notifications, jobMessage);
                    }
                    widget.changeJobStatus('success', jobMessage);
                    // update progressbar 
                    widget.updateProgressbar();

                },
                error: function (xhr, ajaxOptions, thrownError) {
                    widget.settings.onAjaxError.call(widget.element, thrownError);
                    // add message 
                    widget.addMessageToJob([{ type: 'danger', 'message': thrownError }], jobMessage);
                    // change job status
                    widget.changeJobStatus('danger', jobMessage);
                    // update progressbar 
                    widget.updateProgressbar();
                },
                complete: function (data) {
                    delete widget.queue['job-' + widget.current];
                    var hasMore = false;
                    // next batch 
                    var startIndex = widget.current * widget.settings.limit;
                    if (startIndex < widget.totalCount) {
                        hasMore = true;
                        window.setTimeout(function () {
                            widget.processJobs();
                        }, widget.settings.delay);
                    }
                    var response = data.responseJSON;
                    if (!data.responseJSON) {
                        response = {};
                    }
                    widget.settings.onJobComplete.call(widget.element, response, hasMore);
                }
            });

        }

    };
    ajaxJobs.prototype.changeJobStatus = function (newStatus, row) {
        if (newStatus == 'success') {
            $(row).find(".fa").removeClass('fa-spinner fa-spin').addClass('fa-check alert-success');
        } else {
            $(row).find(".fa").removeClass('fa-spinner fa-spin').addClass('fa-times alert-danger');
        }

    };
    ajaxJobs.prototype.addMessageToJob = function (notifications, jobMessage) {
        var widget = this;
        var msgs = '';
        $(notifications).each(function (i, v) {
            if (v.type) { //only if notification is in format [type: '', message:'']
                msgs += "<div class='ajaxjobs-single-message alert-" + v.type + "'>" + v.message + "</div>";
            }

        });
        $(jobMessage).append("<div class='ajaxjobs-job-message ajaxjobs-message-handle'>\
                <a href='#' class='ajaxjobs-message-toggle' data-messageid= "+ widget.current + ">" + widget.locale.message_handle + " </a> \
            </div>\
            <div class='ajax-jobs-messages' id='ajax-jobs-messages-"+ widget.current + "'>\
                "+ msgs + "\
            </div>"
        );
    };
    ajaxJobs.prototype.updateProgressbar = function () {
        var widget = this;
        var value = 0;
        if (widget.totalCount) {
            value = ((widget.current * widget.settings.limit) / widget.totalCount) * 100;
        }
        if (value == NaN) {
            value = 0;
        }
        if (value > 100) {
            value = 100;
        }
        value = Math.round(value);

        $(widget.progressBarCaptionContainer).html(value + '%');
        $(widget.progressBarValueContainer).width(value + '%');

    };

    $.fn.ajaxJobs = function (options) {
        var args = arguments;
        if (typeof options === "string") {
            var returnResponse;
            this.each(function () {
                var plugin = $.data(this, pluginName);
                if (plugin instanceof ajaxJobs) {
                    if (typeof plugin.methods[options] === "function") {
                        returnResponse = plugin.methods[options].apply(plugin, Array.prototype.slice.call(args, 1));
                    } else {
                        $.error("Method " + options + " does not exist in jQuery.wkImage");
                    }
                } else {
                    $.error("Unknown plugin data found by jQuery.wkImage");
                }
            });
            return returnResponse;
        } else {
            return this.each(function () {
                if (!$.data(this, pluginName)) {
                    $.data(this, pluginName, new ajaxJobs(this, options));
                }
            });

        }
    };
}));

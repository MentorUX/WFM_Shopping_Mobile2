﻿
// ******* Internet Explorer MANAGER ******** //
//this is to handle all the stupid IE Stuff
$axure.internal(function($ax) {

    if(!$.browser.msie) return;

    var _applyIEFixedPosition = function() {
        if(Number($.browser.version) >= 7) return;

        $axure(function(diagramObject) { return diagramObject.fixedVertical; }).$()
            .appendTo($('body'))
            .css('position', 'absolute').css('margin-left', 0 + 'px').css('margin-top', 0 + 'px');

        var handleScroll = function() {
            $axure(function(diagramObject) { return diagramObject.fixedVertical; })
                .each(function(diagramObject, elementId) {
                    var win = $(window);
                    var windowWidth = win.width();
                    var windowHeight = win.height();
                    var windowScrollLeft = win.scrollLeft();
                    var windowScrollTop = win.scrollTop();

                    var newLeft = 0;
                    var newTop = 0;
                    var elementQuery = $('#' + elementId);
                    var width = elementQuery.width();
                    var height = elementQuery.height();

                    var horz = diagramObject.fixedHorizontal;
                    if(horz == 'left') {
                        newLeft = windowScrollLeft + diagramObject.fixedMarginHorizontal;
                    } else if(horz == 'center') {
                        newLeft = windowScrollLeft + ((windowWidth - width) / 2) + diagramObject.fixedMarginHorizontal;
                    } else if(horz == 'right') {
                        newLeft = windowScrollLeft + windowWidth - width - diagramObject.fixedMarginHorizontal;
                    }

                    var vert = diagramObject.fixedVertical;
                    if(vert == 'top') {
                        newTop = windowScrollTop + diagramObject.fixedMarginVertical;
                    } else if(vert == 'middle') {
                        newTop = windowScrollTop + ((windowHeight - height) / 2) + diagramObject.fixedMarginVertical;
                    } else if(vert == 'bottom') {
                        newTop = windowScrollTop + windowHeight - height - diagramObject.fixedMarginVertical;
                    }
                    elementQuery.css('top', newTop + 'px').css('left', newLeft + 'px');
                });
        };

        $(window).scroll(handleScroll).resize(handleScroll);
        handleScroll();
    };

    var gMult = 256;
    var rMult = gMult * 256;
    var aMult = rMult * 256;
    var _applyBackground = function() {
        if(Number($.browser.version) >= 9) return;

        var argb = undefined;
        var styleChain = $ax.adaptive.getAdaptiveIdChain($ax.adaptive.currentViewId);
        for(var i = 0; i < styleChain.length && !argb; i++) {
            var style = $ax.pageData.page.adaptiveStyles[styleChain[i]];
            argb = style.fill && style.fill.color;
        }
        if(!argb) argb = $ax.pageData.page.style.fill.color;

        var a = Math.floor(argb / aMult);
        argb -= a * aMult;

        var r = Math.floor(argb / rMult);
        argb -= r * rMult;

        var g = Math.floor(argb / gMult);
        var b = argb - g * gMult;

        //convert the color with alpha to a color with no alpha (assuming white background)
        r = Math.min((r * a) / 255 + 255 - a, 255);
        g = Math.min((g * a) / 255 + 255 - a, 255);
        b = Math.min((b * a) / 255 + 255 - a, 255);

        if(r == 255 && g == 255 && b == 255) return;
        var color = '#';
        color += Math.floor(r / 16).toString(16);
        color += Math.floor(r % 16).toString(16);
        color += Math.floor(g / 16).toString(16);
        color += Math.floor(g % 16).toString(16);
        color += Math.floor(b / 16).toString(16);
        color += Math.floor(b % 16).toString(16);
        $('body').css('background-color', color);
    };

    var getIEOffset = function(transform, rect) {
        var translatedVertexes = [
            $axure.utils.Vector2D(0, 0), //we dont translate, so the orgin is fixed
            transform.mul($axure.utils.Vector2D(0, rect.height)),
            transform.mul($axure.utils.Vector2D(rect.width, 0)),
            transform.mul($axure.utils.Vector2D(rect.width, rect.height))];

        var minX = 0, minY = 0, maxX = 0, maxY = 0;
        $.each(translatedVertexes, function(index, p) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return $axure.utils.Vector2D(
            (maxX - minX - rect.width) / 2,
            (maxY - minY - rect.height) / 2);
    };

    var _filterFromTransform = function(transform) {
        return "progid:DXImageTransform.Microsoft.Matrix(M11=" + transform.m11 +
            ", M12=" + transform.m12 + ", M21=" + transform.m21 +
                ", M22=" + transform.m22 + ", SizingMethod='auto expand')";
    };

    var _applyIERotation = function() {
        if(Number($.browser.version) >= 9) return;

        $axure(function(diagramObject) {
            return ((diagramObject.style.rotation && Math.abs(diagramObject.style.rotation) > 0.1)
                || (diagramObject.style.textRotation && Math.abs(diagramObject.style.textRotation) > 0.1))
                && !diagramObject.isContained;
        }).each(function(diagramObject, elementId) {
            var rotation = diagramObject.style.rotation;
            var $element = $('#' + elementId);
            var width = $element.width();
            var height = $element.height();
            var originX = width / 2;
            var originY = height / 2;

            $element.children().each(function() {
                var $child = $(this);
                var childWidth = $child.width();
                var childHeight = $child.height();
                var centerX = $child.position().left + (childWidth / 2);
                var centerY = $child.position().top + (childHeight / 2);
                var deltaX = centerX - originX;
                var deltaY = centerY - originY;

                var effectiveRotation = rotation;
                var textObject = $ax.getObjectFromElementId($child.attr('id'));
                if(textObject) {
                    if(textObject.style.textRotation) effectiveRotation = textObject.style.textRotation;
                    else effectiveRotation = 0;
                }

                var transform = $ax.utils.Matrix2D.identity().rotate(effectiveRotation);
                var filter = _filterFromTransform(transform);

                $child.css('filter', filter)
                    .width(childWidth + 1)
                    .height(childHeight + 1);

                var p = transform.mul($ax.utils.Vector2D(deltaX, deltaY));

                var ieOffset = getIEOffset(transform, { width: childWidth, height: childHeight });
                $child.css("margin-left", -ieOffset.x - deltaX + p.x).css("margin-top", -ieOffset.y - deltaY + p.y);
            });
        });
    };

    var _fixIEStretchBackground = function() {
        if(Number($.browser.version) >= 9) return;
        var pageStyle = $ax.adaptive.getPageStyle();
        if(!pageStyle.imageRepeat) return;
        //if(!$ax.pageData.page.stretch) return;
        var viewId = $ax.adaptive.currentViewId;
        var imageInfo = viewId ? $ax.pageData.viewIdToBackgroundImageInfo && $ax.pageData.viewIdToBackgroundImageInfo[viewId] : $ax.pageData.defaultBackgroundImageInfo;

        $('body').css('background-image', 'none');
        if($('#bg_img').length == 0) $('body').append('<img id="bg_img"></img>');
        var path = (imageInfo && imageInfo.path) || '';
        $('#bg_img').attr('src', path).css('position', 'fixed').css('z-index', '-10000');
        _resizeIEBackground();
    };

    var _resizeIEBackground = function() {
        //var page = $ax.pageData.page;
        var viewId = $ax.adaptive.currentViewId;
        var pageStyle = $ax.adaptive.getPageStyle();
        if(!$ax.pageData.defaultBackgroundImageInfo && !$ax.pageData.viewIdToBackgroundImageInfo) return;
        var imageInfo = viewId ? $ax.pageData.viewIdToBackgroundImageInfo[viewId] : $ax.pageData.defaultBackgroundImageInfo;
        if(!imageInfo) return;
        var imageWidth = imageInfo.width;
        var imageHeight = imageInfo.height;
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        var isCover = pageStyle.imageRepeat == 'cover';

        var wRatio = windowWidth / imageWidth;
        var hRatio = windowHeight / imageHeight;
        var ratio = wRatio;
        if(isCover) {
            if(hRatio > wRatio) ratio = hRatio;
        } else {
            if(hRatio < wRatio) ratio = hRatio;
        }
        var width = imageWidth * ratio;
        var height = imageHeight * ratio;

        var left = '0px';
        if((isCover && width > windowWidth) || (!isCover && width < windowWidth)) {
            if(pageStyle.imageHorizontalAlignment == 'center') {
                left = ((windowWidth - width) / 2) + 'px';
            } else if(pageStyle.imageHorizontalAlignment == 'far') {
                left = (windowWidth - width) + 'px';
            }
        }

        var top = '0px';
        if((isCover && height > windowHeight) || (!isCover && height < windowHeight)) {
            if(pageStyle.imageVerticalAlignment == 'center') {
                top = ((windowHeight - height) / 2) + 'px';
            } else if(pageStyle.imageVerticalAlignment == 'far') {
                top = (windowHeight - height) + 'px';
            }
        }

        $('#bg_img').css('top', top).css('left', left).css('width', width).css('height', height);
    };

    var _fixAllPngs = function() {
        if(!(/MSIE ((5\.5)|6)/.test(window.navigator.userAgent) && window.navigator.platform == "Win32")) return;

        $('img[src$=".png"]').each(function() {
            if(!this.complete) {
                this.onload = function() { $axure.utils.fixPng(this); };
            } else {
                $axure.utils.fixPng(this);
            }
        });
    };

    var _fixInputSize = function() {
        if(Number($.browser.version) >= 8) return;
        var inputs = $('input').not(':input[type=button], :input[type=submit], :input[type=radio], :input[type=checkbox]');
        inputs.each(function() {
            var $input = $(this);
            $input.css('height', ($input.height() - 4 + 'px')).css('width', ($input.width() - 2 + 'px'));
        });

        var textAreas = $('textarea');
        textAreas.each(function() {
            var $textArea = $(this);
            $textArea.css('height', ($textArea.height() - 6 + 'px')).css('width', ($textArea.width() - 6 + 'px'));
        });
    };

    $(document).ready(function() {
        _fixIEStretchBackground();
        _applyIEFixedPosition();
        $(window).resize(function() {
            _resizeIEBackground();
        });
        $ax.adaptive.bind('viewChanged', function() {
            _fixIEStretchBackground();
            _applyBackground();
        });


        _fixAllPngs();
        _applyIERotation();
        _applyBackground();
        _fixInputSize();
    });


});

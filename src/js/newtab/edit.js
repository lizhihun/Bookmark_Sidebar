($ => {
    "use strict";

    $.EditHelper = function (n) {

        let editMode = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            $("<a></a>").addClass($.cl.newtab.edit).appendTo(n.elm.body);

            initGeneralEvents();

            if (location.href.search(/#edit$/i) > -1) {
                enterEditMode();
            }
        };

        /**
         *
         * @returns {boolean}
         */
        this.isEditMode = () => editMode;

        /**
         * Initialises the general eventhandlers
         */
        const initGeneralEvents = () => {
            n.elm.body.on("click", "a." + $.cl.newtab.edit, (e) => { // enter edit mode
                e.preventDefault();

                if (!editMode) {
                    enterEditMode();
                }
            });
        };

        /**
         * Initialises the menu eventhandlers
         */
        const initBottomMenuEvents = () => {
            $("menu." + $.cl.newtab.infoBar + " > a").on("click", (e) => { // save changes or leave edit mode
                e.preventDefault();
                const elm = $(e.currentTarget);

                if (elm.hasClass($.cl.newtab.cancel)) {
                    leaveEditMode();
                } else if (elm.hasClass($.cl.newtab.save)) {
                    saveChanges().then(() => {
                        leaveEditMode();
                    });
                }
            });

            if (n.helper.model.getUserType() === "premium") {
                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload + " input").on("change", (e) => { // upload background image
                    if (e.currentTarget.files) {
                        const reader = new FileReader();

                        reader.onload = (e) => {
                            try {
                                n.elm.body.addClass($.cl.newtab.customBackground).css("background-image", "url(" + e.target.result + ")");
                            } catch (e) {
                                //
                            }
                        };

                        reader.readAsDataURL(e.currentTarget.files[0]);
                    }
                });

                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload + " a." + $.cl.newtab.remove).on("click", () => { // remove background image
                    n.elm.body.removeClass($.cl.newtab.customBackground).css("background-image", "");
                });
            } else {
                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload).on("click", () => {
                    n.helper.model.call("openLink", {
                        href: $.api.extension.getURL("html/settings.html#premium"),
                        newTab: true
                    });
                });
            }
        };

        /**
         * Saves the changes which were made
         *
         * @returns {Promise}
         */
        const saveChanges = () => {
            return new Promise((resolve) => {
                const loadStartTime = +new Date();
                const loader = n.helper.template.loading().appendTo(n.elm.body);
                n.elm.body.addClass($.cl.loading);

                const searchEngineObj = n.helper.search.getCurrentSearchEngine();
                const searchEngineName = searchEngineObj.name;
                delete searchEngineObj.name;

                const gridType = n.elm.gridLinks.children("select[" + $.attr.type + "='type']")[0].value;

                const data = {
                    "n/searchField": n.elm.search.wrapper.children("select[" + $.attr.type + "='searchField']")[0].value,
                    "n/searchEngine": searchEngineName,
                    "n/searchEngineCustom": searchEngineObj,
                    "n/gridType": gridType,
                    "n/topLinksPosition": n.elm.topLinks.children("select")[0].value,
                    "n/topLinks": getLinkInformation(n.elm.topLinks.find("a." + $.cl.newtab.link))
                };

                if (n.helper.model.getUserType() === "premium") {
                    data["n/gridMaxCols"] = +n.elm.gridLinks.find("select[" + $.attr.type + "='cols']")[0].value;
                    data["n/gridMaxRows"] = +n.elm.gridLinks.find("select[" + $.attr.type + "='rows']")[0].value;
                }

                if (gridType === "custom") {
                    data["n/customGridLinks"] = getLinkInformation(n.elm.gridLinks.find("> ul > li > a"));
                }

                n.helper.model.setData(data).then(() => {
                    const background = n.elm.body.css("background-image").replace(/(^url\("?|"?\)$)/g, "");

                    return new Promise((rslv) => {
                        $.api.storage.local.set({
                            newtabBackground_1: background && background !== "none" ? background : null
                        }, () => {
                            $.api.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                            rslv();
                        });
                    });
                }).then(() => { // load at least 1s
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                }).then(() => {
                    n.elm.body.removeClass($.cl.loading);
                    loader.remove();
                    resolve();
                });
            });
        };

        /**
         * Returns a list of links with title and url by extracting these data from the given list of <a> elements
         *
         * @param elmList
         * @returns {[]}
         */
        const getLinkInformation = (elmList) => {
            const ret = [];
            elmList.forEach((elm) => {
                const label = $(elm).text().trim();
                const url = ($(elm).data("href") || "").trim();

                if (label && label.length > 0 && url && url.length > 0) {
                    ret.push({
                        title: label,
                        url: url
                    });
                }
            });
            return ret;
        };

        /**
         * Removes all html markup which was used to edit the page
         */
        const leaveEditMode = () => {
            editMode = false;
            history.pushState({}, null, location.href.replace(/#edit/g, ""));
            n.elm.body.removeClass($.cl.newtab.edit);

            n.elm.search.wrapper.children("a." + $.cl.newtab.edit).remove();
            n.elm.search.wrapper.children("select").remove();
            n.elm.gridLinks.children("select").remove();
            n.elm.gridLinks.children("div[" + $.attr.type + "='gridsize']").remove();

            n.elm.gridLinks.find("> ul > li > a").removeAttr("draggable");
            n.elm.gridLinks.off("click.edit");
            n.elm.gridLinks.off("dragstart.edit");
            n.elm.gridLinks.off("dragenter.edit");
            n.elm.gridLinks.off("dragover.edit");
            n.elm.gridLinks.off("dragleave.edit");
            n.elm.gridLinks.off("dragend.edit");
            n.elm.gridLinks.off("drop.edit");

            n.elm.topLinks.children("select").remove();
            n.elm.topLinks.find("a:not(." + $.cl.newtab.link + ")").remove();

            n.helper.search.updateSearchEngine(n.helper.model.getData("n/searchEngine"), n.helper.model.getData("n/searchEngineCustom"));
            n.helper.search.setVisibility(n.helper.model.getData("n/searchField"));
            n.helper.gridLinks.setType(n.helper.model.getData("n/gridType"));
            n.helper.gridLinks.setMaxCols(n.helper.model.getData("n/gridMaxCols"));
            n.helper.gridLinks.setMaxRows(n.helper.model.getData("n/gridMaxRows"));
            n.helper.topLinks.refreshEntries();

            n.getBackground().then((background) => {
                n.setBackground(background);
            });

            $.delay(500).then(() => {
                $("menu." + $.cl.newtab.infoBar).remove();
            });
        };

        /**
         * Initialises the edit mode -> adds fields and submit button
         */
        const enterEditMode = () => {
            editMode = true;
            history.pushState({}, null, location.href.replace(/#edit/g, "") + "#edit");

            const menu = $("<menu></menu>")
                .addClass($.cl.newtab.infoBar)
                .append("<a class='" + $.cl.newtab.cancel + "'>" + n.helper.i18n.get("overlay_cancel") + "</a>")
                .append("<a class='" + $.cl.newtab.save + "'>" + n.helper.i18n.get("settings_save") + "</a>")
                .appendTo(n.elm.body);

            const uploadWrapper = $("<div></div>").addClass($.cl.newtab.upload).appendTo(menu);

            if (n.helper.model.getUserType() === "premium") {
                $("<a></a>").addClass($.cl.newtab.remove).appendTo(uploadWrapper);
                $("<div></div>").html("<span>" + n.helper.i18n.get("newtab_upload_background") + "</span><input type=\"file\" accept=\"image/*\" />").appendTo(uploadWrapper);
            } else {
                uploadWrapper.attr("title", n.helper.i18n.get("premium_restricted_text"));
                $("<span></span>").text(n.helper.i18n.get("settings_menu_premium")).addClass($.cl.premium).appendTo(uploadWrapper);
                $("<div></div>").html("<span>" + n.helper.i18n.get("newtab_upload_background") + "</span>").appendTo(uploadWrapper);
            }

            initBottomMenuEvents();

            $.delay().then(() => {
                n.elm.body.addClass($.cl.newtab.edit);
                initSearchConfig();
                initGridSize();
                initGridType();
                initCustomGrid();
                initTopLinks();

                $(document).off("click.edit").on("click.edit", () => {
                    $("div." + $.cl.newtab.editLinkTooltip).remove();
                });

                $.delay(500).then(() => {
                    $(window).trigger("resize");
                });
            });
        };

        /**
         * Initialises the buttons to edit/remove the shortcuts in the top/right corner
         */
        const initTopLinks = () => {
            const buttons = ["<a class='" + $.cl.newtab.edit + "'></a>", "<a class='" + $.cl.newtab.remove + "'></a>", "<a " + $.attr.position + "='left'></a>", "<a " + $.attr.position + "='right'></a>"];
            n.elm.topLinks.find("> ul > li").forEach((elm) => {
                $(elm).append(buttons);
            });

            const currentPos = n.helper.model.getData("n/topLinksPosition");
            const select = $("<select></select>").addClass($.cl.newtab.edit).appendTo(n.elm.topLinks);
            ["left", "right"].forEach((pos) => {
                $("<option value='" + pos + "' " + (currentPos === pos ? "selected" : "") + "></option>").text(n.helper.i18n.get("settings_sidebar_position_" + pos)).appendTo(select);
            });

            select.on("input change", (e) => {
                n.elm.topLinks.attr($.attr.position, e.currentTarget.value);
            });

            $("<a class='" + $.cl.newtab.add + "'></a>").prependTo(n.elm.topLinks);

            n.elm.topLinks.off("click.edit").on("click.edit", "a." + $.cl.newtab.edit, (e) => { // edit
                e.stopPropagation();
                const entry = $(e.currentTarget).parent("li");
                const link = entry.children("a." + $.cl.newtab.link).eq(0);
                showLinkEditTooltip(entry, link, link);
            }).on("click.edit", "a." + $.cl.newtab.add, () => {  // add
                const entry = $("<li></li>")
                    .append("<a class='" + $.cl.newtab.link + "'>&nbsp;</a>")
                    .append(buttons)
                    .prependTo(n.elm.topLinks.children("ul"));

                $.delay().then(() => {
                    const link = entry.children("a." + $.cl.newtab.link).eq(0);
                    showLinkEditTooltip(entry, link, link);
                });
            }).on("click.edit", "a." + $.cl.newtab.remove, (e) => {  // remove
                $(e.currentTarget).parent("li").remove();
            }).on("click.edit", "a[" + $.attr.position + "]", (e) => { // move
                const pos = $(e.currentTarget).attr($.attr.position);
                const entry = $(e.currentTarget).parent("li");

                switch (pos) {
                    case "left": {
                        if (entry.prev("li").length() > 0) {
                            entry.insertBefore(entry.prev("li"));
                        }
                        break;
                    }
                    case "right": {
                        if (entry.next("li").length() > 0) {
                            entry.insertAfter(entry.next("li"));
                        }
                        break;
                    }
                }
            });
        };

        /**
         * Shows the edit tooltip for the given element
         *
         * @param {jsu} wrapper
         * @param {jsu} link
         * @param {jsu} label
         * @param {boolean} deleteButton
         */
        const showLinkEditTooltip = (wrapper, link, label, deleteButton = false) => {
            $("div." + $.cl.newtab.editLinkTooltip).remove();

            const href = (link.data("href") || "").trim();

            const tooltip = $("<div></div>")
                .addClass($.cl.newtab.editLinkTooltip)
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' value='" + label.text().trim().replace(/'/g, "&#x27;") + "' " + $.attr.type + "='label' />")
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_url") + "</label>")
                .append("<input type='text' value='" + href.replace(/'/g, "&#x27;") + "' " + $.attr.type + "='url' />")
                .append("<button type='submit' " + $.attr.type + "='close'>" + n.helper.i18n.get("overlay_close") + "</button>")
                .appendTo(wrapper);

            if (deleteButton) {
                tooltip.children("button[" + $.attr.type + "='close']").before("<button type='submit' " + $.attr.type + "='delete'>" + n.helper.i18n.get("overlay_delete") + "</button>");
            }

            tooltip.on("click", (e) => {
                if (e.target.tagName !== "BUTTON") {
                    e.stopPropagation();
                } else if ($(e.target).attr($.attr.type) === "delete") {
                    link.removeAttr("href").removeData("href").attr($.attr.value, "empty");
                    label.html("&nbsp;");
                }
            });

            tooltip.find("input[type='text']").on("change input", (e) => {
                let val = e.currentTarget.value.trim();

                switch ($(e.currentTarget).attr($.attr.type)) {
                    case "url": {
                        link.removeAttr("href").removeData("href");

                        if (val && val.length > 0) {
                            if (val.search(/^[\w-]+:\/\//) !== 0) { // prepend http if no protocol specified
                                val = "http://" + val;
                            }
                            link.data("href", val).attr($.attr.value, "url");
                        } else {
                            link.attr($.attr.value, "empty");
                        }
                        break;
                    }
                    case "label": {
                        if (val && val.length > 0) {
                            label.text(val.trim());
                        } else {
                            label.html("&nbsp;");
                        }
                        break;
                    }
                }
            });
        };

        /**
         * Initialises the dropdown for the top pages types
         */
        const initGridType = () => {
            const select = $("<select></select>")
                .addClass($.cl.newtab.edit)
                .attr($.attr.type, "type")
                .prependTo(n.elm.gridLinks);

            const types = n.helper.gridLinks.getAllTypes();
            const currentType = n.helper.model.getData("n/gridType");

            Object.keys(types).forEach((name) => {
                const label = n.helper.i18n.get("newtab_top_pages_" + types[name]);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + "></option>").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.gridLinks.setType(e.currentTarget.value);
            });
        };

        /**
         * Initialises the options for the grid with user defined urls
         */
        const initCustomGrid = () => {
            n.elm.gridLinks.off("click.edit").on("click.edit", "> ul > li > a", (e) => { // edit
                if (n.elm.gridLinks.attr($.attr.type) === "custom") {
                    e.stopPropagation();
                    e.preventDefault();
                    const entry = $(e.currentTarget);
                    const wrapper = entry.parent("li");
                    const label = entry.children("span").eq(0);
                    showLinkEditTooltip(wrapper, entry, label, true);
                }
            });

            let draggedElm = null;

            n.elm.gridLinks.find("> ul > li > a").attr("draggable", "draggable");
            n.elm.gridLinks.off("dragstart.edit").on("dragstart.edit", "> ul > li > a", (e) => {
                draggedElm = e.currentTarget;
            });

            n.elm.gridLinks.off("dragenter.edit").on("dragenter.edit", "> ul > li > a", (e) => {
                $(e.currentTarget).addClass($.cl.drag.dragHover);
            });

            n.elm.gridLinks.off("dragover.edit").on("dragover.edit", "> ul > li > a", (e) => { // allow dropping
                e.preventDefault();
            });

            n.elm.gridLinks.off("dragleave.edit").on("dragleave.edit", "> ul > li > a", (e) => {
                $(e.currentTarget).removeClass($.cl.drag.dragHover);
            });

            n.elm.gridLinks.off("dragend.edit").on("dragend.edit", "> ul > li > a", () => {
                n.elm.gridLinks.find("> ul > li > a").removeClass($.cl.drag.dragHover);
                $.delay().then(() => {
                    draggedElm = null;
                });
            });

            n.elm.gridLinks.off("drop.edit").on("drop.edit", "> ul > li > a", (e) => {
                e.preventDefault();
                n.elm.gridLinks.find("> ul > li > a").removeClass($.cl.drag.dragHover);

                if (draggedElm === e.currentTarget) {
                    return;
                }

                const afterNode2 = e.currentTarget.nextElementSibling;
                const parent = e.currentTarget.parentNode;

                if (draggedElm === afterNode2) {
                    parent.insertBefore(draggedElm, e.currentTarget);
                } else {
                    draggedElm.replaceWith(e.currentTarget);
                    parent.insertBefore(draggedElm, afterNode2);
                }
            });
        };

        /**
         * Initialises the dropdown for the top pages appearances
         */
        const initGridSize = () => {
            const wrapper = $("<div></div>")
                .attr($.attr.type, "gridsize")
                .html("<strong>" + n.helper.i18n.get("newtab_top_pages_grid_size") + "</strong>")
                .prependTo(n.elm.gridLinks);

            ["Cols", "Rows"].forEach((type) => {
                const currentValue = n.helper.model.getData("n/gridMax" + type);
                const s = $("<select></select>")
                    .addClass($.cl.newtab.edit)
                    .attr($.attr.type, type.toLowerCase())
                    .appendTo(wrapper);

                for (let i = 1; i < 10; i++) {
                    $("<option value='" + i + "' " + (currentValue === i ? "selected" : "") + "></option>").text(i).appendTo(s);
                }

                s.on("input change", (e) => {
                    const linkList = getLinkInformation(n.elm.gridLinks.find("> ul > li > a"));

                    n.helper.gridLinks["setMax" + type](e.currentTarget.value).then(() => { // recover the (maybe changed) links, since changing the grid layout will reset all unsaved changes
                        n.elm.gridLinks.find("> ul > li > a").forEach((elm, i) => {
                            if (linkList[i]) {
                                $(elm)
                                    .data("href", linkList[i].url)
                                    .attr("href", linkList[i].url)
                                    .attr($.attr.value, "url");
                                $(elm).children("span").eq(0).text(linkList[i].title);
                            } else {
                                return false;
                            }
                        });
                    });
                });
            });
            $("<span></span>").text("x").insertAfter(wrapper.children("select").eq(0));

            if (n.helper.model.getUserType() !== "premium") {
                wrapper.addClass($.cl.premium).attr("title", n.helper.i18n.get("premium_restricted_text"));
                wrapper.find("select").attr("disabled", "disabled");
                $("<span></span>").text(n.helper.i18n.get("settings_menu_premium")).addClass($.cl.premium).appendTo(wrapper);

                wrapper.on("click", () => {
                    n.helper.model.call("openLink", {
                        href: $.api.extension.getURL("html/settings.html#premium"),
                        newTab: true
                    });
                });
            }
        };

        /**
         * Initialises the edit button for the search engine and the dropdown to show/hide the search field
         */
        const initSearchConfig = () => {
            const select = $("<select></select>")
                .addClass($.cl.newtab.edit)
                .attr($.attr.type, "searchField")
                .prependTo(n.elm.search.wrapper);

            const currentType = n.helper.model.getData("n/searchField");

            ["show", "hide"].forEach((name) => {
                const label = n.helper.i18n.get("newtab_search_field_" + name);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + "></option>").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.search.setVisibility(e.currentTarget.value);
            });


            const edit = $("<a></a>").addClass($.cl.newtab.edit).appendTo(n.elm.search.wrapper);
            edit.on("click", (e) => {
                e.preventDefault();
                n.helper.overlay.create("searchEngine", n.helper.i18n.get("newtab_search_engine_headline"));
            });
        };
    };

})(jsu);
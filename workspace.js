/* global cpdefine chilipeppr cprequire */
cprequire_test(["inline:com-chilipeppr-workspace-nodemcu"], function(termWs) {

    console.log("initting workspace");
    termWs.init();
    $('title').html("Console Workspace");

} /*end_test*/ );

// This is the main definition of your widget. Give it a unique name.
cpdefine("inline:com-chilipeppr-workspace-nodemcu", ["chilipeppr_ready"], function() {
    return {
        /**
         * The ID of the widget. You must define this and make it unique.
         */
        id: "com-chilipeppr-workspace-nodemcu", // Make the id the same as the cpdefine id
        name: "Workspace / NodeMCU", // The descriptive name of your widget.
        desc: `A ChiliPeppr Workspace that lets you interact with the NodeMCU device. \
The NodeMCU device is an ESP8266 wifi module with an attached USB serial port bridge \
so you can easily use it and program it from your computer via the serial port. Thus, the NodeMCU \
works brilliantly with ChiliPeppr. Secondly, \
the NodeMCU has the Lua language preloaded onto the ESP8266 so you can easily program \
the device.This workspace gives you convenience methods for programming the NodeMCU device. \
You can buy the ESP8266 on ebay.com or aliexpress.com.`,
        url: "(auto fill by runme.js)", // The final URL of the working widget as a single HTML file with CSS and Javascript inlined. You can let runme.js auto fill this if you are using Cloud9.
        fiddleurl: "(auto fill by runme.js)", // The edit URL. This can be auto-filled by runme.js in Cloud9 if you'd like, or just define it on your own to help people know where they can edit/fork your widget
        githuburl: "(auto fill by runme.js)", // The backing github repo
        testurl: "(auto fill by runme.js)", // The standalone working widget so can view it working by itself
        /**
         * Contains reference to the Console widget object.
         */
        widgetConsole: null,
        /**
         * Contains reference to the Serial Port JSON Server object.
         */
        widgetSpjs: null,
        /**
         * The workspace's init method. It loads the Console widget and then the SPJS widget.
         */
        init: function() {

            var that = this;

            $('#' + this.id).removeClass("hidden");

            // Load the console widget
            this.loadConsoleWidget(function() {

                console.log("console widget loaded, now lets load spjs");

                // now we can load the SPJS widget
                that.loadSpjsWidget(function() {

                    // if we get here, we can init the Console Widget
                    that.widgetConsole.init(true);
                    //that.widgetConsole.resize();

                    that.setupResize();
                })

            });

            this.loadFlashMsg();
            setTimeout(this.loadWorkspaceMenu.bind(this), 100);
            this.setupNodeMcuCommands();

        },
        /**
         * Setup all the command buttons to do their thing.
         */
        setupNodeMcuCommands: function() {
            var that = this;
            setTimeout(function() {
                console.log("doing btns");
                $('#' + that.id + ' .nodemcu-commands .btn').each(function(index) {
                    var el = $(this);
                    var dataClick = el.data('click');
                    console.log("btn el:", el, "data-click:", dataClick);
                    if (that[dataClick]) {
                        el.click(that[dataClick].bind(that));
                        console.log("bound to ", that[dataClick]);
                    }
                });

            }, 300);
        },
        onClickReset: function(evt) {
            console.log("got onClickReset. evt:", evt);
            this.send('node.restart()');
        },
        onClickHeap: function(evt) {
            console.log("got onClickHeap. evt:", evt);
            this.send('=node.heap()');
        },
        onClickChipId: function(evt) {
            console.log("got onClickChipId. evt:", evt);
            this.send('=node.chipid()');
        },
        onClickChipInfo: function(evt) {
            console.log("got onClickChipInfo. evt:", evt);
            this.send('=node.info()');
        },
        onClickFlashId: function(evt) {
            console.log("got onClickFlashId. evt:", evt);
            this.send('=node.flashid()');
        },
        onClickFsInfo: function(evt) {
            console.log("got onClickFsInfo. evt:", evt);
            this.send('r,u,t=file.fsinfo()\nprint("Total : " .. t .. " bytes\\r\\nUsed  : " .. u .. " bytes\\r\\nRemain: " .. r .. " bytes\\r\\n")\nr=nil u=nil t=nil');
        },
        onClickListFiles: function(evt) {
            console.log("got onClickListFiles. evt:", evt);
            this.send('l = file.list()\nfor k,v in pairs(l) do\nprint("name:" .. k .. ", size:" .. v)\nend\nl=nil');
        },
        onClickBlinkOld: function(evt) {
            console.log("got onClickBlink. evt:", evt);
            this.send(`lighton=0
gpio.mode(4, gpio.OUTPUT)
tmr.alarm(0,1000,1,function()
    if lighton==0 then 
        lighton=1 
        gpio.write(4, gpio.LOW)
        --print("light on")
    else 
        lighton=0 
        gpio.write(4, gpio.HIGH)
        --print("light off")
    end 
end)`);
        },
        onClickBlink: function(evt) {
            console.log("got onClickBlink. evt:", evt);
            this.send(`-- Config
pin = 4            --> GPIO2
value = gpio.LOW
duration = 1000    --> 1 second
-- Function toggles LED state
function toggleLED ()
    if value == gpio.LOW then
        value = gpio.HIGH
    else
        value = gpio.LOW
    end

    gpio.write(pin, value)
end
-- Initialise the pin
gpio.mode(pin, gpio.OUTPUT)
gpio.write(pin, value)
-- Create an interval
tmr.alarm(0, duration, 1, toggleLED)`);
        },
        onClickReadVdd33: function(evt) {
            console.log("got onClickReadVdd33. evt:", evt);
            this.send(`v = adc.readvdd33() / 1000
print(v)
v=nil`);
        },
        onClickListAps: function(evt) {
            console.log("got onClickListAps. evt:", evt);
            this.send(`function listap(t)
    for ssid,v in pairs(t) do
        authmode, rssi, bssid, channel = 
            string.match(v, "(%d),(-?%d+),(%x%x:%x%x:%x%x:%x%x:%x%x:%x%x),(%d+)")
        print(ssid,authmode,rssi,bssid,channel)
    end
end
      
wifi.sta.getap(listap)`);
        },
        sendCtr: 0,
        send: function(txt) {
            var cmds = txt.split(/\n/g);
            var ctr = 0;
            var that = this;

            for (var indx in cmds) {
                setTimeout(function() {

                    var cmd = cmds[ctr];

                    chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {
                        D: cmd + '\n',
                        Id: "nodemcu-" + that.sendCtr++
                    });

                    ctr++;

                }, 10 * indx);
            }
        },
        /**
         * Returns the billboard HTML, CSS, and Javascript for this Workspace. The billboard
         * is used by the home page, the workspace picker, and the fork pulldown to show a
         * consistent name/image/description tag for the workspace throughout the ChiliPeppr ecosystem.
         */
        billboard: function() {
            var el = $('#' + this.id + '-billboard');
            el.removeClass("hidden");
            return el;
        },
        /**
         * Listen to window resize event.
         */
        setupResize: function() {
            $(window).on('resize', this.onResize.bind(this));
        },
        /**
         * When browser window resizes, forcibly resize the Console window
         */
        onResize: function() {
            this.widgetConsole.resize();
        },
        /**
         * Load the Console widget via chilipeppr.load()
         */
        loadConsoleWidget: function(callback) {
            var that = this;
            chilipeppr.load(
                "#consoleWidget",
                "http://fiddle.jshell.net/chilipeppr/rczajbx0/show/light/",
                function() {
                    // Callback after widget loaded into #myDivWidgetInsertedInto
                    cprequire(
                        ["inline:com-chilipeppr-widget-spconsole"], // the id you gave your widget
                        function(mywidget) {
                            // Callback that is passed reference to your newly loaded widget
                            console.log("My widget just got loaded.", mywidget);

                            that.widgetConsole = mywidget;

                            // load spjs widget so we can test
                            //http://fiddle.jshell.net/chilipeppr/vetj5fvx/show/light/
                            callback();


                        }
                    );
                }
            );
        },
        /**
         * Load the Serial Port JSON Server widget via chilipeppr.load()
         */
        loadSpjsWidget: function(callback) {

            var that = this;

            chilipeppr.load(
                "#spjsWidget",
                "http://fiddle.jshell.net/chilipeppr/vetj5fvx/show/light/",
                function() {
                    console.log("mycallback got called after loading spjs module");
                    cprequire(["inline:com-chilipeppr-widget-serialport"], function(spjs) {
                        //console.log("inside require of " + fm.id);
                        spjs.setSingleSelectMode();
                        //spjs.init(null, "timed", 9600);
                        spjs.init({
                            isSingleSelectMode: true,
                            defaultBuffer: "timed",
                            defaultBaud: 9600,
                            bufferEncouragementMsg: 'For your NodeMCU device please choose the "timed" buffer in the pulldown and a 9600 baud rate before connecting.'
                        });
                        //spjs.showBody();
                        spjs.consoleToggle();

                        that.widgetSpjs = spjs;

                        callback();

                    });
                }
            );
        },
        /**
         * Load Flash Module so we can show flash messages.
         */
        loadFlashMsg: function() {
            chilipeppr.load("#com-chilipeppr-widget-flash-instance",
                "http://fiddle.jshell.net/chilipeppr/90698kax/show/light/",
                function() {
                    console.log("mycallback got called after loading flash msg module");
                    cprequire(["inline:com-chilipeppr-elem-flashmsg"], function(fm) {
                        //console.log("inside require of " + fm.id);
                        fm.init();
                    });
                }
            );
        },
        /**
         * Load the workspace menu.
         */
        loadWorkspaceMenu: function() {
            // Workspace Menu with Workspace Billboard
            var that = this;
            chilipeppr.load(
                "http://fiddle.jshell.net/chilipeppr/zMbL9/show/light/",
                function() {
                    require(['inline:com-chilipeppr-elem-pubsubviewer'], function(pubsubviewer) {

                        var el = $('#' + that.id + ' .com-chilipeppr-ws-menu .dropdown-menu-ws');
                        console.log("got callback for attachto menu for workspace for nodemcu.. attaching to el:", el);

                        pubsubviewer.attachTo(
                            el,
                            that,
                            "Workspace"
                        );
                    });
                }
            );
        }
    }

});
class PomodoroClock extends HTMLElement {

    constructor(configs = {}) {

        //#region WebComponentConstructor

        super();
        this.attachShadow({ mode: "open" });

        this.elements = {};

        //Loads external audio
        this.alarmAudio = new Audio('PomodoroWebComponent/Resources/Audio/alarm.ogg');

        //Loads external fonts
        const fonts = document.createElement("style");
        fonts.textContent = "/* Code injected by <pomodoro-clock> */ @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap'); @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');";
        document.head.appendChild(fonts);

        //Loads external icons 
        const icons = document.createElement("link");
        icons.setAttribute("rel", "stylesheet");
        icons.setAttribute("href", "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=close,pause,play_arrow,replay,settings,skip_next");
        document.head.appendChild(icons);

        //Loads external css
        fetch('PomodoroWebComponent/Style/pomodoroStyle.css')
            .then(response => response.text())
            .then(css => {
                const style = document.createElement('style');
                style.textContent = css;
                this.shadowRoot.appendChild(style);
            })
            .catch(error => {
                console.error('Error loading CSS:', error);
            });

        //Loads external html
        fetch('PomodoroWebComponent/HTML/pomodoroStruct.html')
            .then(response => response.text())
            .then(html => {
                const body = document.createElement('div');
                body.innerHTML = html;
                this.shadowRoot.appendChild(body);
                this.initWebElements();
                this.restartClock();
            })
            .catch(error => {
                console.error('Error loading HTML structure:', error);
            })

        //#endregion

        //#region PomodoroConstructor

        this.configs = {
            numCycles: configs.numCycles || 4, // A cycle is a pomodoro session + a pause session.
            pomodoroLengthMin: configs.pomodoroLengthMin || 25,
            shortBreakLengthMin: configs.shortBreakLengthMin || 5,
            longBreakLengthMin: configs.longBreakLengthMin || 15,
            autoStart: configs.autoStart || false,
            alarmVolume: configs.alarmVolume || 0
        }

        this.sessionTypes = {
            POMODORO: 'POMODORO',
            SHORTBREAK: 'SHORTBREAK',
            LONGBREAK: 'LONGBREAK'
        }

        this.currentCycleNum = 0;
        this.currentSessionType = this.sessionTypes.POMODORO;
        this.totalTimeMs = 0;
        this.remainingTotalTimeMs = 0;
        this.remainingSessionTimeMs = 0;
        this.intervalId = null;

        //#endregion

    }

    //#region WebComponentMethods

    getElement(selector) {
        return this.shadowRoot.querySelector(selector);
    };

    initWebElements() {
        try {
            //Elements
            this.elements = {
                textTimer: this.getElement("#pmdr-time"),
                textSessionType: this.getElement("#pmdr-session-type"),
                textCycle: this.getElement("#pmdr-cycle"),
                SVGCircleProgressBar: this.getElement("#pmdr-progress-bar"),
                buttonStartPause: this.getElement("#pmdr-button-start-pause"),
                buttonStartPauseIcon: this.getElement("#pmdr-button-start-pause-icon"),
                buttonRestart: this.getElement("#pmdr-button-restart"),
                buttonSkip: this.getElement("#pmdr-button-skip"),
                buttonSettings: this.getElement("#pmdr-button-settings"),
                dialogSettings: this.getElement("#pmdr-dialog-settings"),
                buttonCloseDialogSettins: this.getElement("#pmdr-button-close-dialog-settings"),
                formSettings: this.getElement("#pmdr-form-settings"),
                inputNumCycles: this.getElement('[setting="numCycles"]'),
                inputPomodoroLengthMin: this.getElement('[setting="pomodoroLengthMin"]'),
                inputShortBreakLengthMin: this.getElement('[setting="shortBreakLengthMin"]'),
                inputLongBreakLengthMin: this.getElement('[setting="longBreakLengthMin"]'),
                inputAutoStart: this.getElement('[setting="autoStart"]'),
                inputSwitchAutoStart: this.getElement("#pmdr-input-switch-autostart"),
                inputAlarmVolume: this.getElement('[setting="alarmVolume"]'),
                buttonResetSettings: this.getElement("#pmdr-button-reset-settings")
            };

            this.elements.dialogSettings.showModal()

            //Events
            this.elements.buttonStartPause.addEventListener("click", () => {
                this.elements.buttonStartPause.getAttribute("mode") == "start" ? this.startClock() : this.pauseClock();
            });
            this.elements.buttonRestart.addEventListener("click", this.restartClock.bind(this));
            this.elements.buttonSkip.addEventListener("click", this.endSessionHandler.bind(this));
            this.elements.buttonSettings.addEventListener("click", () => this.elements.dialogSettings.showModal());
            this.elements.formSettings.addEventListener("submit", this.applyFormSettings.bind(this));
            this.elements.buttonResetSettings.addEventListener("click", this.resetSettingsFormToDefault.bind(this));
            this.elements.buttonCloseDialogSettins.addEventListener("click", () => this.elements.dialogSettings.close())
            this.elements.inputSwitchAutoStart.addEventListener("keypress", () => this.elements.inputAutoStart.click());            

        } catch (error) {
            console.error(error)
        }
    }


    updateTimeElements() {
        try {
            // Updates timer
            const minutes = Math.floor(this.remainingSessionTimeMs / 60000);
            const seconds = Math.floor((this.remainingSessionTimeMs % 60000) / 1000);
            this.elements.textTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Updates progress bar
            const radius = this.elements.SVGCircleProgressBar.getAttribute("r");
            const circunference = 2 * Math.PI * radius;
            const percentage = this.remainingTotalTimeMs / this.totalTimeMs;
            const offset = circunference - (percentage * circunference);

            this.elements.SVGCircleProgressBar.setAttribute("stroke-dashoffset", offset);

            // Updates cycle counter
            this.elements.textCycle.textContent = `${String(this.currentCycleNum)}/${String(this.configs.numCycles)}`;

            // Updates session type
            this.elements.textSessionType.textContent = `${this.currentSessionType}`
        } catch (error) {
            console.error(error)
        }
    }


    updateStartPauseButton() {
        try {
            //Invert start/pause
            this.elements.buttonStartPause.setAttribute("mode", this.intervalId === null ? "start" : "pause");
            this.elements.buttonStartPause.getAttribute("mode") === "start" ? this.elements.buttonStartPauseIcon.textContent = "play_arrow" : this.elements.buttonStartPauseIcon.textContent = "pause"

        } catch (error) {
            console.error(error);
        }
    }


    resetSettingsFormToDefault() {
        try {
            this.elements.inputNumCycles.value = 4;
            this.elements.inputPomodoroLengthMin.value = 25;
            this.elements.inputShortBreakLengthMin.value = 5;
            this.elements.inputLongBreakLengthMin.value = 15;
            this.elements.inputAutoStart.checked = false;
            this.elements.inputAlarmVolume.value = 0;
        } catch (error) {
            console.error(`Error reseting settings: ${error}`);
        }
    }


    applyFormSettings() {
        try {
            this.configs.numCycles = parseInt(this.elements.inputNumCycles.value) || 4;
            this.configs.pomodoroLengthMin = parseInt(this.elements.inputPomodoroLengthMin.value) || 25;
            this.configs.shortBreakLengthMin = parseInt(this.elements.inputShortBreakLengthMin.value) || 5;
            this.configs.longBreakLengthMin = parseInt(this.elements.inputLongBreakLengthMin.value) || 15;
            this.configs.autoStart = this.elements.inputAutoStart.checked || false;
            this.configs.alarmVolume = parseFloat(this.elements.inputAlarmVolume.value) || 0;

        } catch (error) {
            console.error(`Error applying settings: ${error}`);
        }

        this.restartClock();
    }

    //#endregion

    //#region PomodoroMethods

    restartClock() {
        try {
            console.log(`Restarting clock at ${Date.now()}`);

            this.currentCycleNum = 1;
            this.currentSessionType = this.sessionTypes.POMODORO;
            this.totalTimeMs = (
                + (this.configs.numCycles * this.configs.pomodoroLengthMin * 60 * 1000)
                + ((this.configs.numCycles - 1) * this.configs.shortBreakLengthMin * 60 * 1000)
                + (this.configs.longBreakLengthMin * 60 * 1000)
            );
            this.remainingTotalTimeMs = this.totalTimeMs;
            this.remainingSessionTimeMs = this.configs.pomodoroLengthMin * 60 * 1000;
            this.alarmAudio.volume = this.configs.alarmVolume;
            

            this.loadSession(this.sessionTypes.POMODORO);
            this.updateTimeElements();
            this.updateStartPauseButton()
        } catch (error) {
            console.error(error);
        }
    }


    startClock() {
        try {
            if (this.intervalId != null) return;

            console.log(`Starting clock at ${Date.now()}`);

            this.intervalId = setInterval(() => {
                if (this.remainingSessionTimeMs <= 0) {
                    this.alarmAudio.play();
                    this.pauseClock();
                    this.endSessionHandler();
                    return
                }
                this.remainingSessionTimeMs -= 1000;
                this.remainingTotalTimeMs -= 1000;

                this.updateTimeElements();
            }, 1000);

            this.updateStartPauseButton()
        } catch (error) {
            console.error(error);
        }

    }


    pauseClock() {
        if (this.intervalId == null) return;

        console.log(`Pausing clock at ${Date.now()}`);

        clearInterval(this.intervalId);
        this.intervalId = null;

        this.updateStartPauseButton()
    }


    loadSession(sessionType) {
        this.pauseClock();
        this.currentSessionType = sessionType || this.sessionTypes.POMODORO;

        switch (sessionType) {
            case this.sessionTypes.POMODORO:
                this.remainingSessionTimeMs = this.configs.pomodoroLengthMin * 60 * 1000;
                break;
            case this.sessionTypes.SHORTBREAK:
                this.remainingSessionTimeMs = this.configs.shortBreakLengthMin * 60 * 1000;
                break;
            case this.sessionTypes.LONGBREAK:
                this.remainingSessionTimeMs = this.configs.longBreakLengthMin * 60 * 1000;
                break;
            default:
                this.remainingSessionTimeMs = this.configs.pomodoroLengthMin * 60 * 1000;
                break;
        }

        console.log(`Loading next session: 
            \nSession type: ${this.currentSessionType}
            \nSession time: ${this.remainingSessionTimeMs / 60 / 1000}
            \nRemaining total time: ${this.remainingTotalTimeMs / 60 / 1000}
            \nCurrent cycle: ${this.currentCycleNum}`);

        //Don't auto start in the first session.
        if (this.currentCycleNum === 1 && this.currentSessionType === this.sessionTypes.POMODORO) return;
        if (this.configs.autoStart) this.startClock();
    }


    endSessionHandler() {
        try {
            if (this.remainingSessionTimeMs > 0) this.remainingTotalTimeMs -= this.remainingSessionTimeMs; // Subtract remaining time if the session is ended earlier.
            
            if (this.currentCycleNum <= this.configs.numCycles) {
    
                if (this.currentSessionType === this.sessionTypes.POMODORO) {
                    this.loadSession(this.currentCycleNum === this.configs.numCycles ? this.sessionTypes.LONGBREAK : this.sessionTypes.SHORTBREAK);
                } else {
    
                    if (this.currentCycleNum === this.configs.numCycles) {
                        this.restartClock();
                        return;
                    }
    
                    this.currentCycleNum += 1;
                    this.loadSession(this.sessionTypes.POMODORO)
                }
    
                this.updateTimeElements();
                return
    
            }
    
            this.restartClock();
        } catch (error) {
            console.error(`Error ending session: ${error}`);
        }

    }

    //#endregion

}

customElements.define('pomodoro-clock', PomodoroClock);

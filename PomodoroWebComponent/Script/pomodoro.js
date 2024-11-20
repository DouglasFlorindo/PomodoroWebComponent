class PomodoroClock extends HTMLElement {

    constructor(configs = {}) {

        //#region WebComponentConstructor

        super();
        this.attachShadow({ mode: "open" });

        //Loads external fonts
        const fonts = document.createElement("style");
        fonts.textContent = "/* Code injected by <pomodoro-clock> */ @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap'); @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');";
        document.head.appendChild(fonts);

        //Loads external icons 
        const icons = document.createElement("link");
        icons.setAttribute("rel", "stylesheet");
        icons.setAttribute("href", "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=pause,play_arrow,replay,settings,skip_next");
        document.head.appendChild(icons);
        
        //Loads external css
        fetch('/PomodoroWebComponent/Style/pomodoroStyle.css')
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
        fetch('/PomodoroWebComponent/HTML/pomodoroStruct.html')
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
            autoStart: configs.autoStart || false
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

    initWebElements() {
        try {
            this.timeElement = this.shadowRoot.querySelector("#pmdr-time");
            this.sessionTypeElement = this.shadowRoot.querySelector("#pmdr-session-type");
            this.cycleElement = this.shadowRoot.querySelector("#pmdr-cycle");
            this.progressBarElement = this.shadowRoot.querySelector("#pmdr-progress-bar");
            this.buttonStartPauseElement = this.shadowRoot.querySelector("#pmdr-button-start-pause");
            this.buttonStartPauseIconElement = this.shadowRoot.querySelector("#pmdr-button-start-pause-icon");
            this.buttonRestartElement = this.shadowRoot.querySelector("#pmdr-button-restart");
            this.buttonSkipElement = this.shadowRoot.querySelector("#pmdr-button-skip");
            this.buttonSettingsElement = this.shadowRoot.querySelector("#pmdr-button-settings");
            this.dialogSettingsElement = this.shadowRoot.querySelector("#pmdr-dialog-settings");

            // this.dialogSettingsElement.showModal()

            this.buttonStartPauseElement.addEventListener("click", () => {
                this.buttonStartPauseElement.getAttribute("mode") == "start" ? this.startClock() : this.pauseClock();
            });
            this.buttonRestartElement.addEventListener("click", this.restartClock.bind(this));
            this.buttonSkipElement.addEventListener("click", this.endSessionHandler.bind(this));
            this.buttonSettingsElement.addEventListener("click", () => this.dialogSettingsElement.showModal())

        } catch (error) {
            console.error(error)
        }
    }


    updateTimeElements() {
        try {
            // Updates timer
            const minutes = Math.floor(this.remainingSessionTimeMs / 60000);
            const seconds = Math.floor((this.remainingSessionTimeMs % 60000) / 1000);
            this.timeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Updates progress bar
            const radius = this.progressBarElement.getAttribute("r");
            const circunference = 2 * Math.PI * radius;
            const percentage = this.remainingTotalTimeMs / this.totalTimeMs;
            const offset = circunference - (percentage * circunference);

            this.progressBarElement.setAttribute("stroke-dashoffset", offset);

            // Updates cycle counter
            this.cycleElement.textContent = `${String(this.currentCycleNum)}/${String(this.configs.numCycles)}`;

            // Updates session type
            this.sessionTypeElement.textContent = `${this.currentSessionType}`
        } catch (error) {
            console.error(error)
        }
    }


    updateCycleElement() {
        try {
            
        } catch (error) {
            console.error(error)
        }
    }


    updateStartPauseButton() {
        try {
            //Invert start/pause
            this.buttonStartPauseElement.setAttribute("mode", this.intervalId === null ? "start" : "pause");
            this.buttonStartPauseElement.getAttribute("mode") === "start" ? this.buttonStartPauseIconElement.textContent = "play_arrow" : this.buttonStartPauseIconElement.textContent = "pause"

        } catch (error) {
            console.error(error);
        }
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

        this.updateCycleElement();

        console.log(`Loading next session: 
            \nSession type: ${this.currentSessionType}
            \nSession time: ${this.remainingSessionTimeMs / 60 / 1000}
            \nRemaining total time: ${this.remainingTotalTimeMs / 60 / 1000}
            \nCurrent cycle: ${this.currentCycleNum}`);
        
        //Doesn't auto start in the first session.
        if (this.currentCycleNum === 1 && this.currentSessionType === this.sessionTypes.POMODORO) return;
        if (this.configs.autoStart) this.startClock();
    }


    endSessionHandler() {
        if (this.remainingSessionTimeMs > 0) this.remainingTotalTimeMs -= this.remainingSessionTimeMs; // Subtract remaining time if the session is ended earlier.

        if (this.currentCycleNum <= this.configs.numCycles) {

            if (this.currentSessionType == this.sessionTypes.POMODORO) {
                this.loadSession(this.currentCycleNum === this.configs.numCycles ? this.sessionTypes.LONGBREAK : this.sessionTypes.SHORTBREAK);
            } else {

                if (this.currentCycleNum == this.configs.numCycles) {
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
    }

    //#endregion
}

customElements.define('pomodoro-clock', PomodoroClock);

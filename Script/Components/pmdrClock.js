class PomodoroClock {
    constructor(configs = {}) {
        
        this.configs = { 
            numPomodoroSessions: configs.numPomodoroSessions || 4,
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
        
        this.currentSessionNum = 0;
        this.currentSessionType = this.sessionTypes.POMODORO;
        this.remainingTotalTimeMs = 0;
        this.remainingSessionTimeMs = 0;
        this.intervalId = null;

        this.restartClock();
    }


    restartClock() {
        this.currentSessionNum = 1;
        this.currentSessionType = this.sessionTypes.POMODORO;
        this.remainingTotalTimeMs = (
            + (this.configs.numPomodoroSessions * this.configs.pomodoroLengthMin * 60 * 1000) 
            + ((this.configs.numPomodoroSessions - 1) * this.configs.shortBreakLengthMin * 60 * 1000) 
            + (this.configs.longBreakLengthMin * 60 * 1000)
        );
        this.remainingSessionTimeMs = 0;

        this.loadSession(this.sessionTypes.POMODORO);
    }


    startClock() {
        if (this.intervalId != null) return;

        this.intervalId = setInterval(() => {
            if (this.remainingSessionTimeMs <= 0) {
                this.pauseClock();
                this.endSessionHandler();
            }
            this.remainingSessionTimeMs -= 1000;
            this.remainingTotalTimeMs -= 1000;
            // console.log(this.remainingSessionTimeMs);
        }, 1000);

    }


    pauseClock() {
        if (this.intervalId == null) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
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

        if (this.configs.autoStart) this.startClock();
    }


    endSessionHandler() {

        if (this.currentSessionNum < this.configs.numPomodoroSessions) {

            if (this.currentSessionType == this.sessionTypes.POMODORO) {
                this.loadSession(this.currentSessionNum === this.configs.numPomodoroSessions ? this.sessionTypes.LONGBREAK : this.sessionTypes.SHORTBREAK);
            } else {
                this.currentSessionNum += 1;
                this.loadSession(this.sessionTypes.POMODORO)
            }
            return 

        }

        this.restartClock();
    }
}

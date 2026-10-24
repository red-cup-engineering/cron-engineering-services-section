# @red-cup-engineering/cron-engineering-services-section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Owns the five-field cron calendar rule: crontab(5) as Kubernetes' CronJob reads it, a `schedule` beside the IANA `timeZone` it is read in. `./schedule` is the rule's denotation, the set of instants it names:

- `cronRuleOf(expression)` reads a rule once and refuses a malformed one, naming the field;
- `latestScheduledAtOrBefore(rule, timeZone, at)` and `nextScheduledAfter(rule, timeZone, at)` give the scheduled instants around a time;
- `isScheduledAt(rule, timeZone, at)` says whether an instant is one of them.

Wall time is read in the zone. A wall time daylight saving skips does not occur, and a repeated one occurs once, at its first instant. A rule that matches no day in five years has no instant.

The MetroPlat clock (organizing `work/recurring`) and the web platform's emulated scheduler read cron through this section. No other cron reading belongs in the house.

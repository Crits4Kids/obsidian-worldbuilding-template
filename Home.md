# Home

**Start here:** [[World Bible]] · [[_System/Dashboards/Maintenance|Maintenance]] · [[_System/Dashboards/Sessions|Sessions]] · [[Maps/World Map|World Map]]

Commands (Ctrl/Cmd+P, type **WB:**): New entity · New campaign · New session · Deck of Worlds · Refresh infobox · Rebuild World Bible · Export player handouts · Archive note

## Recently changed
```dataview
TABLE type, status, summary FROM "World" OR "Campaigns" OR "Micro-settings" SORT file.mtime DESC LIMIT 15
```

## People
![[_System/Bases/People.base]]

## Places
![[_System/Bases/Places.base]]

## Active clocks
```dataview
TABLE stage + "/" + max_stage AS Progress, owner FROM "World/Plot" WHERE plot_type = "clock" AND status = "active"
```

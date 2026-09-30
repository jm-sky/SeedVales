# Q08 — The Long Way to Water

**Status: propozycja N; build/water.**

## Założenie

Wren prowadzi owce na odległe źródło, bo wspólna studnia V jest przy placu i zwierzęta blokują kolejkę. Dena uważa, że koryto przy pastwisku rozwiąże problem; Wren obawia się, że nikt nie będzie go napełniał. Gracz musi zbudować lub zaplanować rozwiązanie, w którym utrzymanie ma właściciela.

I: studnia, wiadro, koryto, transport wody i budowa. N: harmonogram napełniania, lokalizacja i odpowiedzialność.

## Sceny

`accepted`, `routeMeasured`, `plan=trough|well|rota`, `built`, `settled`.

**S1 — Wren:** “The sheep reach the well before I do. Then everyone is thirsty and no one is happy.”
**Player:** How far is the pasture?
**Wren:** Far enough that a full bucket becomes a punishment.
**Dena:** A trough near the fence would help.
**Wren:** A dry trough is a wooden apology.

**S2 — oględziny:**
**Player:** The ground falls toward this corner. A trough here needs less carrying.
**Wren:** It also needs a lid and a path that does not become mud.
**Dena:** Or we build a small well closer to the field.
**Player:** That is more work and a different owner.

**S3 — Ada/strażnik:**
**Ada:** Do not put a trough on the road.
**Player:** Then where?
**Ada:** Off the turning space, where a cart can still pass. I am not choosing your water. I am protecting the road.

**S4 — wybór:**
**Player [trough]:** Build by the pasture, with Wren’s household responsible for daily filling.
**Wren:** I can agree if the duty is written.
**Player [well]:** Request a new well with shared maintenance.
**Dena:** Shared maintenance means a rota, not “someone will do it.”
**Player [rota]:** Keep the current well and set times for animals.
**Wren:** That costs no timber and every day of patience.

**S5 — budowa/ustalenie:**
**Dena:** The bucket holds enough for the trough, not the entire pasture.
**Player:** Then two trips are part of the plan.
**Wren:** Good. Plans should contain the tiring part.

**S6 — sprawdzenie:**
**Player:** The sheep can reach it without entering the road.
**Wren:** And if it is empty?
**Player:** The duty marker says whose turn it is.
**Wren:** A marker cannot lift a bucket.

### Zakończenia

**E1 — Trough at the fence:** `plan=trough`, completed build, Wren accepts duty. Skutek: krótsze codzienne przejścia, koszt drewna/wody i realna praca Wren.

**Wren:** It is close enough to help and far enough not to block anyone.
**Dena:** Tomorrow you fill it.
**Wren:** Tomorrow I fill it. The day after, you remind me.

**E2 — A proper well:** `plan=well`, zgoda osady, materiały i ukończona budowa. Skutek: bezpieczna woda i nowy obowiązek konserwacji; większy koszt i czas, brak darmowej infrastruktury.

**Dena:** The well is everyone’s now.
**Ada:** Then everyone gets a turn to keep it working.
**Wren:** I will take the first week for the animals.

**E3 — The patient queue:** `plan=rota`, 3 dni rzeczywistych terminów przestrzeganych (N). Skutek: brak nowej budowy, mniejsze zużycie surowców, większy koszt uwagi; po złamaniu grafiku quest może wrócić.

**Wren:** It works when the times are kept.
**Dena:** That is not the same as easy.
**Player:** Easy was never the proposal.

Odmowa nie karze; zwierzęta korzystają ze starego źródła. Brak wody przerywa budowę i nie tworzy suchego koryta. I: water/build. N: rota, właścicielstwo i UI obowiązku. Do decyzji: czy nowe studnie są v1 czy SET-04.

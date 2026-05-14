// Vignelli-inspired diagrammatic subway lines
// Lines use only horizontal, vertical, and 45° diagonal segments
// Positions are approximate but styled as a transit diagram
export interface SubwayLine {
  id: string;
  color: string;
  weight: number;
  path: [number, number][]; // [lat, lng]
}

export const SUBWAY_LINES: SubwayLine[] = [
  // 1 Line - Broadway/7th Ave Local (full length)
  {
    id: "1",
    color: "#EE352E",
    weight: 6,
    path: [
      [40.868, -73.920], // Inwood-207 St
      [40.860, -73.925], // Dyckman
      [40.849, -73.934], // 181 St
      [40.841, -73.940], // 168 St
      [40.834, -73.945], // 157 St
      [40.827, -73.950], // 145 St
      [40.822, -73.954], // 137 St
      [40.816, -73.958], // 125 St
      [40.808, -73.964], // 116 St
      [40.804, -73.966], // 110 St
      [40.800, -73.968], // 103 St
      [40.794, -73.972], // 96 St
      [40.789, -73.977], // 86 St
      [40.784, -73.980], // 79 St
      [40.779, -73.982], // 72 St
      [40.774, -73.982], // 66 St
      [40.768, -73.982], // 59 St Columbus
      [40.762, -73.984], // 50 St
      [40.756, -73.987], // Times Sq-42 St
      [40.751, -73.991], // 34 St-Penn
      [40.747, -73.994], // 28 St
      [40.744, -73.996], // 23 St
      [40.741, -73.998], // 18 St
      [40.738, -74.000], // 14 St
      [40.733, -74.003], // Christopher St
      [40.728, -74.005], // Houston St
      [40.722, -74.006], // Canal St
      [40.719, -74.007], // Franklin St
      [40.715, -74.009], // Chambers St
      [40.712, -74.012], // Cortlandt St
      [40.708, -74.013], // Rector St
      [40.702, -74.013], // South Ferry
    ],
  },
  // 2/3 Express - Lenox Ave
  {
    id: "2/3",
    color: "#EE352E",
    weight: 6,
    path: [
      [40.821, -73.936], // 145 St Lenox
      [40.814, -73.941], // 135 St
      [40.808, -73.946], // 125 St Lenox
      [40.802, -73.950], // 116 St Lenox
      [40.799, -73.952], // Central Park North
      [40.794, -73.960], // merge toward west
      [40.794, -73.972], // 96 St (join 1 line)
    ],
  },
  // 4/5/6 - Lexington Ave
  {
    id: "4/5/6",
    color: "#00933C",
    weight: 6,
    path: [
      [40.804, -73.938], // 125 St (Lex)
      [40.799, -73.941], // 116 St
      [40.795, -73.944], // 110 St
      [40.791, -73.948], // 103 St
      [40.785, -73.951], // 96 St
      [40.779, -73.955], // 86 St
      [40.774, -73.960], // 77 St
      [40.769, -73.964], // 68 St
      [40.763, -73.968], // 59 St
      [40.757, -73.972], // 51 St
      [40.753, -73.977], // Grand Central
      [40.746, -73.982], // 33 St
      [40.743, -73.984], // 28 St
      [40.739, -73.986], // 23 St
      [40.736, -73.990], // 14 St-Union Sq
      [40.730, -73.991], // Astor Place
      [40.726, -73.995], // Bleecker St
      [40.722, -73.997], // Spring St
      [40.718, -74.000], // Canal St
      [40.713, -74.004], // Brooklyn Bridge
      [40.710, -74.007], // Fulton St
      [40.707, -74.009], // Wall St
      [40.704, -74.014], // Bowling Green
    ],
  },
  // A/C - 8th Ave Express/Local
  {
    id: "A/C",
    color: "#2850AD",
    weight: 6,
    path: [
      [40.859, -73.934], // 190 St
      [40.851, -73.938], // 181 St (A)
      [40.847, -73.940], // 175 St
      [40.841, -73.940], // 168 St
      [40.836, -73.940], // 163 St
      [40.825, -73.944], // 145 St
      [40.811, -73.953], // 125 St
      [40.805, -73.955], // 116 St (B/C)
      [40.801, -73.958], // 110 St (B/C)
      [40.797, -73.961], // 103 St (B/C)
      [40.792, -73.965], // 96 St (B/C)
      [40.786, -73.969], // 86 St (B/C)
      [40.781, -73.972], // 81 St Museum
      [40.776, -73.976], // 72 St (B/C)
      [40.768, -73.982], // 59 St Columbus (join 1)
      [40.762, -73.986], // 50 St
      [40.757, -73.990], // 42 St-Port Auth
      [40.752, -73.993], // 34 St-Penn (A/C/E)
      [40.746, -73.998], // 23 St (C/E)
      [40.741, -74.001], // 14 St (8th Ave)
      [40.732, -74.000], // W 4 St
      [40.726, -74.000], // Spring St
      [40.721, -74.001], // Canal St (A/C/E)
      [40.713, -74.010], // Chambers/WTC
      [40.710, -74.007], // Fulton St
    ],
  },
  // N/Q/R/W - Broadway
  {
    id: "N/Q/R/W",
    color: "#FCCC0A",
    weight: 6,
    path: [
      [40.764, -73.973], // 5 Ave/59 St
      [40.765, -73.981], // 57 St-7 Ave
      [40.760, -73.984], // 49 St
      [40.756, -73.987], // Times Sq (join)
      [40.750, -73.988], // 34 St-Herald Sq
      [40.745, -73.988], // 28 St
      [40.741, -73.989], // 23 St
      [40.736, -73.990], // 14 St-Union Sq
      [40.730, -73.993], // 8 St-NYU
      [40.724, -73.998], // Prince St
      [40.720, -74.000], // Canal St
      [40.714, -74.007], // City Hall
      [40.710, -74.012], // Cortlandt St (R/W)
      [40.708, -74.013], // Rector St (R/W)
      [40.703, -74.013], // Whitehall St
    ],
  },
  // B/D - 6th Ave Express
  {
    id: "B/D",
    color: "#FF6319",
    weight: 6,
    path: [
      [40.830, -73.942], // 155 St
      [40.825, -73.944], // 145 St
      [40.811, -73.953], // 125 St
      [40.763, -73.982], // 7 Ave
      [40.759, -73.981], // 47-50 Rock
      [40.754, -73.984], // 42 St-Bryant Park
      [40.750, -73.988], // 34 St-Herald Sq
      [40.732, -74.000], // W 4 St
      [40.725, -73.996], // Broadway-Lafayette
      [40.713, -74.004], // Grand St area
    ],
  },
  // F/M - 6th Ave Local
  {
    id: "F/M",
    color: "#FF6319",
    weight: 4,
    path: [
      [40.764, -73.978], // 57 St (F)
      [40.759, -73.981], // 47-50 Rock
      [40.754, -73.984], // 42 St-Bryant Park
      [40.749, -73.988], // 34 St
      [40.742, -73.993], // 23 St (F/M)
      [40.738, -73.996], // 14 St (6th Ave)
      [40.732, -74.000], // W 4 St
      [40.725, -73.996], // Broadway-Lafayette
      [40.723, -73.990], // 2 Ave
      [40.720, -73.986], // Lower East Side
      [40.719, -73.988], // Delancey-Essex
      [40.714, -73.990], // East Broadway
      [40.702, -73.987], // York St
    ],
  },
  // L - 14th St Crosstown
  {
    id: "L",
    color: "#A7A9AC",
    weight: 5,
    path: [
      [40.741, -74.001], // 8th Ave
      [40.738, -73.996], // 6th Ave
      [40.736, -73.990], // Union Sq
      [40.733, -73.986], // 3 Ave
      [40.731, -73.982], // 1 Ave
    ],
  },
  // 7 - Flushing
  {
    id: "7",
    color: "#B933AD",
    weight: 5,
    path: [
      [40.756, -74.002], // 34 St-Hudson Yards
      [40.756, -73.987], // Times Sq
      [40.754, -73.984], // 5 Ave/Bryant Park
      [40.753, -73.977], // Grand Central
    ],
  },
  // J/Z - Nassau
  {
    id: "J/Z",
    color: "#996633",
    weight: 5,
    path: [
      [40.720, -73.994], // Bowery
      [40.719, -73.988], // Delancey-Essex
      [40.715, -74.000], // Canal St
      [40.713, -74.003], // Chambers
      [40.710, -74.007], // Fulton
      [40.707, -74.011], // Broad St
    ],
  },
  // S - 42nd St Shuttle
  {
    id: "S",
    color: "#808183",
    weight: 4,
    path: [
      [40.756, -73.987], // Times Sq
      [40.753, -73.977], // Grand Central
    ],
  },
];

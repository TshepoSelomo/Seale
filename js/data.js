(function () {
  "use strict";

  const CATALOG = [
    { id: "womens-cut", name: "Women's cut & finish", category: "Hair", duration: 60 },
    { id: "mens-cut", name: "Men's cut", category: "Hair", duration: 30 },
    { id: "blowout", name: "Blowout", category: "Hair", duration: 45 },
    { id: "colour", name: "Full colour", category: "Hair", duration: 150 },
    { id: "balayage", name: "Balayage", category: "Hair", duration: 180 },
    { id: "silk", name: "Silk press", category: "Hair", duration: 90 },
    { id: "knotless", name: "Knotless braids, mid back", category: "Braids", duration: 240 },
    { id: "cornrows", name: "Cornrows", category: "Braids", duration: 90 },
    { id: "locs", name: "Loc retwist", category: "Braids", duration: 120 },
    { id: "beard", name: "Beard sculpt", category: "Barber", duration: 30 },
    { id: "skin-fade", name: "Skin fade", category: "Barber", duration: 45 },
    { id: "gel-mani", name: "Gel manicure", category: "Nails", duration: 60 },
    { id: "pedicure", name: "Spa pedicure", category: "Nails", duration: 75 },
    { id: "massage", name: "Deep tissue, 60 min", category: "Spa", duration: 60 },
    { id: "facial", name: "Glow facial", category: "Spa", duration: 50 }
  ];

  const AREAS = [
    { id: "rosebank", label: "Rosebank", lat: -26.1459, lng: 28.0436 },
    { id: "sandton", label: "Sandton", lat: -26.1076, lng: 28.0567 },
    { id: "melville", label: "Melville", lat: -26.1756, lng: 28.0086 },
    { id: "parkhurst", label: "Parkhurst", lat: -26.1375, lng: 28.0165 },
    { id: "hyde-park", label: "Hyde Park", lat: -26.1255, lng: 28.034 },
    { id: "braamfontein", label: "Braamfontein", lat: -26.1936, lng: 28.035 },
    { id: "maboneng", label: "Maboneng", lat: -26.2025, lng: 28.058 },
    { id: "fourways", label: "Fourways", lat: -26.0167, lng: 28.0064 }
  ];

  const SALONS = [
    {
      id: "lumen",
      name: "Lumen Atelier",
      suburb: "Sandton",
      address: "18 Fredman Drive, Sandton",
      lat: -26.1058,
      lng: 28.0542,
      rating: 4.8,
      reviews: 326,
      blurb: "Colour-first studio a short walk from the Sandton streets.",
      open: 9,
      close: 19,
      closedDays: [0],
      tones: ["#3c2a24", "#e7a27a"],
      stylists: [
        { id: "lumen-naledi", name: "Naledi Mokoena", role: "Colourist", categories: ["Hair"] },
        { id: "lumen-chris", name: "Chris van Wyk", role: "Senior stylist", categories: ["Hair", "Barber"] },
        { id: "lumen-priya", name: "Priya Naidoo", role: "Cut specialist", categories: ["Hair"] }
      ],
      prices: {
        "womens-cut": 620,
        "mens-cut": 280,
        blowout: 390,
        colour: 1480,
        balayage: 2140,
        silk: 670,
        beard: 180,
        "skin-fade": 260
      }
    },
    {
      id: "knot",
      name: "Knot & Co",
      suburb: "Melville",
      address: "7 7th Street, Melville",
      lat: -26.1768,
      lng: 28.0068,
      rating: 4.9,
      reviews: 214,
      blurb: "Braids, locs, and presses in a Melville house studio.",
      open: 8,
      close: 18,
      closedDays: [0],
      tones: ["#24342c", "#d7b483"],
      stylists: [
        { id: "knot-thandiwe", name: "Thandiwe Nkosi", role: "Braider", categories: ["Braids"] },
        { id: "knot-lerato", name: "Lerato Molefe", role: "Loc and press specialist", categories: ["Braids", "Hair"] }
      ],
      prices: {
        blowout: 260,
        silk: 480,
        knotless: 980,
        cornrows: 420,
        locs: 560
      }
    },
    {
      id: "copper",
      name: "The Copper Room",
      suburb: "Rosebank",
      address: "The Zone, Oxford Road, Rosebank",
      lat: -26.1478,
      lng: 28.0412,
      rating: 4.6,
      reviews: 489,
      blurb: "Neighbourhood chairs for cuts, colour, braids, and nails.",
      open: 8,
      close: 19,
      closedDays: [0],
      tones: ["#6b341c", "#f0c7a4"],
      stylists: [
        { id: "copper-megan", name: "Megan Botha", role: "Stylist", categories: ["Hair", "Braids"] },
        { id: "copper-samir", name: "Samir Patel", role: "Barber", categories: ["Barber", "Hair"] },
        { id: "copper-ayanda", name: "Ayanda Cele", role: "Nail tech", categories: ["Nails"] }
      ],
      prices: {
        "womens-cut": 450,
        "mens-cut": 220,
        blowout: 300,
        colour: 980,
        balayage: 1620,
        silk: 520,
        knotless: 920,
        beard: 150,
        "skin-fade": 240,
        "gel-mani": 320,
        pedicure: 340
      }
    },
    {
      id: "marula",
      name: "Marula Spa",
      suburb: "Hyde Park",
      address: "Hyde Park Corner, Hyde Park",
      lat: -26.1272,
      lng: 28.0322,
      rating: 4.7,
      reviews: 178,
      blurb: "Quiet treatment rooms for nails, massage, and facials.",
      open: 9,
      close: 17,
      closedDays: [0],
      tones: ["#31443a", "#c9d7c4"],
      stylists: [
        { id: "marula-zanele", name: "Zanele Dube", role: "Massage therapist", categories: ["Spa"] },
        { id: "marula-hannah", name: "Hannah Kruger", role: "Aesthetician", categories: ["Spa", "Nails"] }
      ],
      prices: {
        "gel-mani": 390,
        pedicure: 430,
        massage: 780,
        facial: 690
      }
    },
    {
      id: "fade",
      name: "Fade District",
      suburb: "Braamfontein",
      address: "22 Juta Street, Braamfontein",
      lat: -26.1948,
      lng: 28.0334,
      rating: 4.5,
      reviews: 402,
      blurb: "Fades, beards, and cornrows with Sunday hours.",
      open: 9,
      close: 19,
      closedDays: [1],
      tones: ["#1d2430", "#8fb4c9"],
      stylists: [
        { id: "fade-kagiso", name: "Kagiso Mahlangu", role: "Barber", categories: ["Barber", "Braids"] },
        { id: "fade-ethan", name: "Ethan Jacobs", role: "Barber", categories: ["Barber", "Hair"] }
      ],
      prices: {
        "mens-cut": 180,
        beard: 120,
        "skin-fade": 200,
        cornrows: 350
      }
    },
    {
      id: "ivory",
      name: "Ivory & Ink",
      suburb: "Parkhurst",
      address: "4 4th Avenue, Parkhurst",
      lat: -26.1362,
      lng: 28.0188,
      rating: 4.7,
      reviews: 151,
      blurb: "Editorial cuts and colour on a tree-lined avenue.",
      open: 9,
      close: 18,
      closedDays: [0, 1],
      tones: ["#3a3142", "#e7d3c5"],
      stylists: [
        { id: "ivory-simone", name: "Simone Venter", role: "Editorial stylist", categories: ["Hair"] },
        { id: "ivory-boipelo", name: "Boipelo Khumalo", role: "Colourist", categories: ["Hair", "Braids"] }
      ],
      prices: {
        "womens-cut": 540,
        "mens-cut": 260,
        blowout: 350,
        colour: 1320,
        balayage: 1890,
        silk: 590,
        knotless: 1100
      }
    },
    {
      id: "sole",
      name: "Sole & Sage",
      suburb: "Fourways",
      address: "Forest Road, Fourways",
      lat: -26.0188,
      lng: 28.0094,
      rating: 4.4,
      reviews: 267,
      blurb: "Nails and body treatments, open every day.",
      open: 9,
      close: 17,
      closedDays: [],
      tones: ["#3f4a34", "#d5e2b8"],
      stylists: [
        { id: "sole-melissa", name: "Melissa Pillay", role: "Nail artist", categories: ["Nails"] },
        { id: "sole-nomsa", name: "Nomsa Radebe", role: "Therapist", categories: ["Spa"] }
      ],
      prices: {
        "gel-mani": 280,
        pedicure: 360,
        massage: 640,
        facial: 540
      }
    },
    {
      id: "maboneng",
      name: "Maboneng Studio",
      suburb: "Maboneng",
      address: "264 Fox Street, Maboneng",
      lat: -26.2038,
      lng: 28.0564,
      rating: 4.3,
      reviews: 338,
      blurb: "The lower price list in the city, from cuts to braids and nails.",
      open: 9,
      close: 18,
      closedDays: [0],
      tones: ["#4a2c28", "#e6b199"],
      stylists: [
        { id: "maboneng-sibusiso", name: "Sibusiso Ndlovu", role: "Stylist", categories: ["Hair", "Braids", "Barber"] },
        { id: "maboneng-fatima", name: "Fatima Essop", role: "Stylist", categories: ["Hair", "Nails"] }
      ],
      prices: {
        "womens-cut": 290,
        "mens-cut": 150,
        blowout: 180,
        colour: 720,
        silk: 350,
        knotless: 750,
        cornrows: 280,
        locs: 400,
        beard: 90,
        "skin-fade": 160,
        "gel-mani": 190,
        pedicure: 220
      }
    }
  ];

  window.SEALE_DATA = { CATALOG, AREAS, SALONS };
})();

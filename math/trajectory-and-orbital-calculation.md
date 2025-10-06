---
description: >-
  This document describes the models, formulas, and Python implementation used
  to calculate the trajectories of Near-Earth Objects (NEOs). The system fetches
  real-time data from NASA's NeoWs API, applie
---

# Trajectory and Orbital Calculation

### Orbital Mechanics Formulas

The following formulas are the basis for calculating the position and trajectory of a celestial body under the gravitational influence of a central body like the Sun.

#### Equation of an Ellipse in Polar Coordinates

Describes the shape of the orbit, where $$r$$ is the distance to the Sun, $$a$$ is the semi-major axis, $$e$$ is the eccentricity, and $$ν$$ is the true anomaly.

<figure><img src="../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

#### Mean Anomaly Calculation

Calculates the averaged angular position ($$M$$) as a function of time, starting from an initial mean anomaly ($$M0​$$) at a given epoch, the mean motion ($$n$$), and the elapsed time ($$Δt$$).

<figure><img src="../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

#### Kepler's Equation

Relates the mean anomaly ($$M$$) to the eccentric anomaly ($$E$$). This equation is transcendental and is solved numerically.

<figure><img src="../.gitbook/assets/image (3) (1).png" alt=""><figcaption></figcaption></figure>

#### Relation between Eccentric and True Anomaly

Converts the auxiliary geometric angle ($$E$$) to the actual physical angle in the orbit ($$ν$$). An alternative and more numerically stable form is used in the code.

<figure><img src="../.gitbook/assets/image (4) (1).png" alt=""><figcaption></figcaption></figure>

#### Radial Distance Calculation

Calculates the distance to the Sun at a specific instant using the eccentric anomaly ($$E$$).

<figure><img src="../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

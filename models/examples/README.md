# Replay examples

These files demonstrate the import formats. Timing, velocities, and positions are illustrative and are not dynamically consistent flight simulations.

- `orientation.csv`: Assembly orientation replay; XYZ degrees.
- `flight.csv`: Flyover's existing Position series format.
- `state-3dof.csv`: choose 3DOF, geodetic position, ENU velocity.
- `state-6dof-euler.csv`: choose 6DOF, geodetic position, ENU velocity, Euler attitude, ENU attitude reference, Forward/Left/Up body axes, degrees/degrees per second.
- `state-6dof-quaternion.csv`: same settings, with Quaternion attitude instead of Euler.

Flyover's Example button generates a series for the currently selected settings, including ECEF, NED, radians, or body velocity.

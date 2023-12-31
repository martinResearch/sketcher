# Sketcher

try it [here](https://martinresearch.github.io/sketcher/)

## Inspirations

* https://github.com/AntonEvmenenko/2d_geometric_constraint_solver
* https://web-cad.org/sketcher.htm

## TODO

* add the possibility to undo the last actions.
* add colinear line segments constraints.
* use a smaller tolerance for point-on-line constraint detection.
* expose the tolerance parameters in the UI.
* add a button to delete the constraint next to each constraint.
* add a mode where each new detected constraint is validated by the user before it gets added to the set of constraints.
* try to keep the last edited points fixed and release these fix point constraints until there is enough degrees of freedom
* add the possibility to add constraints manually like in [here](https://github.com/AntonEvmenenko/2d_geometric_constraint_solver).
* fix the SVG export.
* accelerate the geometric constraints solver by using the Jacobian sparsity when computing the jacobian with finite differences. We could compute the jacobian of each constraint independently.
* use the jacobian sparsity when solving the linear system in Levenberg-Marquardt. We could use the conjugate gradient algorithm or a gaussian message passing solver.
import React from 'react'
import { DriverClass } from '../services/robotsManager'

interface RobotListProps {
  onSelect: (driver: DriverClass) => void
  selectedRobot: string | null,
  robots: DriverClass[]
}

const RobotList: React.FC<RobotListProps> = ({ onSelect, selectedRobot, robots }) => {

  return (
    <ul className="robot-list">
      {robots.map((robot) => (
        <li
          key={robot.robotName}
          className={`robot-item ${selectedRobot === robot.robotName ? 'selected' : ''}`}
          onClick={() => onSelect(robot)}
        >
          {robot.robotName}
        </li>
      ))}
    </ul>
  )
}

export default RobotList

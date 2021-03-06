import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {autobind} from '../helpers';
import {RefHolderPropType} from '../prop-types';
import RefHolder from '../models/ref-holder';
import Tooltip from '../atom/tooltip';
import Keystroke from '../atom/keystroke';

function theBuckStopsHere(event) {
  event.stopPropagation();
}

export default class HunkHeaderView extends React.Component {
  static propTypes = {
    refTarget: RefHolderPropType.isRequired,
    hunk: PropTypes.object.isRequired,
    isSelected: PropTypes.bool.isRequired,
    stagingStatus: PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    selectionMode: PropTypes.oneOf(['hunk', 'line']).isRequired,
    toggleSelectionLabel: PropTypes.string.isRequired,
    discardSelectionLabel: PropTypes.string.isRequired,

    tooltips: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,

    toggleSelection: PropTypes.func.isRequired,
    discardSelection: PropTypes.func.isRequired,
    mouseDown: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    autobind(this, 'didMouseDown');

    this.refDiscardButton = new RefHolder();
  }

  render() {
    const conditional = {
      'github-HunkHeaderView--isSelected': this.props.isSelected,
      'github-HunkHeaderView--isHunkMode': this.props.selectionMode === 'hunk',
    };

    return (
      <div className={cx('github-HunkHeaderView', conditional)} onMouseDown={this.didMouseDown}>
        <span className="github-HunkHeaderView-title">
          {this.props.hunk.getHeader().trim()} {this.props.hunk.getSectionHeading().trim()}
        </span>
        <button
          className="github-HunkHeaderView-stageButton"
          onClick={this.props.toggleSelection}
          onMouseDown={theBuckStopsHere}>
          <Keystroke keymaps={this.props.keymaps} command="core:confirm" refTarget={this.props.refTarget} />
          {this.props.toggleSelectionLabel}
        </button>
        {this.props.stagingStatus === 'unstaged' && (
          <Fragment>
            <button
              ref={this.refDiscardButton.setter}
              className="icon-trashcan github-HunkHeaderView-discardButton"
              onClick={this.props.discardSelection}
              onMouseDown={theBuckStopsHere}
            />
            <Tooltip
              manager={this.props.tooltips}
              target={this.refDiscardButton}
              title={this.props.discardSelectionLabel}
            />
          </Fragment>
        )}
      </div>
    );
  }

  didMouseDown(event) {
    return this.props.mouseDown(event, this.props.hunk);
  }
}

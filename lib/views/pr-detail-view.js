import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';

import PrTimelineContainer from '../controllers/pr-timeline-controller';
import PrStatusesView from '../views/pr-statuses-view';
import Octicon from '../atom/octicon';
import IssueishBadge from '../views/issueish-badge';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import EmojiReactionsView from '../views/emoji-reactions-view';
import PeriodicRefresher from '../periodic-refresher';
import {EnableableOperationPropType} from '../prop-types';
import {autobind} from '../helpers';
import {addEvent} from '../reporter-proxy';
import PrCommitsView from '../views/pr-commits-view';

function createCheckoutState(name) {
  return function(cases) {
    return cases[name] || cases.default;
  };
}

export const checkoutStates = {
  HIDDEN: createCheckoutState('hidden'),
  DISABLED: createCheckoutState('disabled'),
  BUSY: createCheckoutState('busy'),
  CURRENT: createCheckoutState('current'),
};

export class BarePullRequestDetailView extends React.Component {
  static propTypes = {
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }),
    switchToIssueish: PropTypes.func.isRequired,
    checkoutOp: EnableableOperationPropType.isRequired,
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string,
      }),
    }),
    issueish: PropTypes.shape({
      __typename: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      countedCommits: PropTypes.shape({
        totalCount: PropTypes.number.isRequired,
      }).isRequired,
      isCrossRepository: PropTypes.bool,
      changedFiles: PropTypes.number.isRequired,
      url: PropTypes.string.isRequired,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      state: PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
      ]).isRequired,
      author: PropTypes.shape({
        login: PropTypes.string.isRequired,
        avatarUrl: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      }).isRequired,
      reactionGroups: PropTypes.arrayOf(
        PropTypes.shape({
          content: PropTypes.string.isRequired,
          users: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
          }).isRequired,
        }),
      ).isRequired,
    }).isRequired,
  }

  state = {
    refreshing: false,
  }

  constructor(props) {
    super(props);
    autobind(this, 'handleRefreshClick', 'refresh', 'renderPullRequestBody', 'recordOpenInBrowserEvent');
  }

  componentDidMount() {
    this.refresher = new PeriodicRefresher(BarePullRequestDetailView, {
      interval: () => 5 * 60 * 1000,
      getCurrentId: () => this.props.issueish.id,
      refresh: this.refresh,
      minimumIntervalPerId: 2 * 60 * 1000,
    });
    // auto-refresh disabled for now until pagination is handled
    // this.refresher.start();
  }

  componentWillUnmount() {
    this.refresher.destroy();
  }

  renderPrMetadata(issueish, repo) {
    return (
      <div className="github-IssueishDetailView-headerRow">
        <span className="github-IssueishDetailView-meta">
          <a className="github-IssueishDetailView-metaAuthor"
            href={issueish.author.url}>{issueish.author.login}</a> wants to merge{' '}
          <a className="github-IssueishDetailView-commitCount"
            href={issueish.url + '/commits'}>{issueish.countedCommits.totalCount} commits</a> and{' '}
          <a className="github-IssueishDetailView-fileCount"
            href={issueish.url + '/files'}>{issueish.changedFiles} changed files</a> into{' '}
          <code className="github-IssueishDetailView-baseRefName">{issueish.isCrossRepository ?
            `${repo.owner.login}/${issueish.baseRefName}` : issueish.baseRefName}</code> from{' '}
          <code className="github-IssueishDetailView-headRefName">{issueish.isCrossRepository ?
            `${issueish.author.login}/${issueish.headRefName}` : issueish.headRefName}</code>
        </span>
      </div>
    );
  }

  renderPullRequestBody(issueish, childProps) {
    return (
      <Tabs>
        <TabList className="github-IssueishDetailView-tablist">
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="info" className="github-IssueishDetailView-tab-icon" />Overview</Tab>
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="checklist" className="github-IssueishDetailView-tab-icon" />
            Build Status
          </Tab>
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="git-commit"
              className="github-IssueishDetailView-tab-icon"
            />
              Commits
          </Tab>
        </TabList>
        {/* 'Files Changed' and 'Reviews' tabs to be added in the future. */}

        {/* overview */}
        <TabPanel>
          <GithubDotcomMarkdown
            html={issueish.bodyHTML || '<em>No description provided.</em>'}
            switchToIssueish={this.props.switchToIssueish}
          />
          <EmojiReactionsView reactionGroups={issueish.reactionGroups} />
          <PrTimelineContainer
            {...childProps}
            switchToIssueish={this.props.switchToIssueish}
          />

        </TabPanel>

        {/* build status */}
        <TabPanel>
          <div className="github-IssueishDetailView-buildStatus">
            <PrStatusesView pullRequest={issueish} displayType="full" />
          </div>
        </TabPanel>

        {/* commits */}
        <TabPanel>
          <PrCommitsView pullRequest={issueish} />
        </TabPanel>
      </Tabs>
    );
  }

  render() {
    const repo = this.props.repository;
    const issueish = this.props.issueish;
    const childProps = {
      issue: issueish.__typename === 'Issue' ? issueish : null,
      pullRequest: issueish.__typename === 'PullRequest' ? issueish : null,
    };

    return (
      <div className="github-IssueishDetailView native-key-bindings">
        <div className="github-IssueishDetailView-container">

          <header className="github-IssueishDetailView-header">
            <div className="github-IssueishDetailView-headerRow">
              <div className="github-IssueishDetailView-headerGroup">
                <a className="github-IssueishDetailView-avatar" href={issueish.author.url}>
                  <img className="github-IssueishDetailView-avatarImage"
                    src={issueish.author.avatarUrl}
                    title={issueish.author.login}
                    alt={issueish.author.login}
                  />
                </a>
                <a className="github-IssueishDetailView-title" href={issueish.url}>{issueish.title}</a>
              </div>
              <div className="github-IssueishDetailView-headerGroup">
                <Octicon
                  icon="repo-sync"
                  className={cx('github-IssueishDetailView-headerRefreshButton', {refreshing: this.state.refreshing})}
                  onClick={this.handleRefreshClick}
                />
              </div>
            </div>
            {this.renderPrMetadata(issueish, repo)}
            <div className="github-IssueishDetailView-headerRow">
              <div className="github-IssueishDetailView-headerGroup">
                <IssueishBadge className="github-IssueishDetailView-headerBadge"
                  type={issueish.__typename}
                  state={issueish.state}
                />
                <a className="github-IssueishDetailView-headerLink"
                  title="open on GitHub.com"
                  href={issueish.url} onClick={this.recordOpenInBrowserEvent}>
                  {repo.owner.login}/{repo.name}#{issueish.number}
                </a>
                <span className="github-IssueishDetailView-headerStatus">
                  <PrStatusesView pullRequest={issueish} displayType="check" />
                </span>
              </div>
              <div className="github-IssueishDetailView-headerGroup">
                {this.renderCheckoutButton()}
              </div>
            </div>
          </header>
          {this.renderPullRequestBody(issueish, childProps)}

          <footer className="github-IssueishDetailView-footer">
            <a className="github-IssueishDetailView-footerLink icon icon-mark-github"
              href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}
            </a>
          </footer>

        </div>
      </div>
    );
  }

  renderCheckoutButton() {
    const {checkoutOp} = this.props;
    let extraClass = null;
    let buttonText = 'Checkout';
    let buttonTitle = null;

    if (!checkoutOp.isEnabled()) {
      buttonTitle = checkoutOp.getMessage();
      const reason = checkoutOp.why();
      if (reason({hidden: true, default: false})) {
        return null;
      }

      buttonText = reason({
        current: 'Checked out',
        default: 'Checkout',
      });

      extraClass = 'github-IssueishDetailView-checkoutButton--' + reason({
        disabled: 'disabled',
        busy: 'busy',
        current: 'current',
      });
    }

    const classNames = cx('btn', 'btn-primary', 'github-IssueishDetailView-checkoutButton', extraClass);
    return (
      <button
        className={classNames}
        disabled={!checkoutOp.isEnabled()}
        title={buttonTitle}
        onClick={() => checkoutOp.run()}>
        {buttonText}
      </button>
    );
  }

  handleRefreshClick(e) {
    e.preventDefault();
    this.refresher.refreshNow(true);
  }

  recordOpenInBrowserEvent() {
    addEvent('open-issueish-in-browser', {package: 'github', component: this.constructor.name});
  }

  refresh() {
    if (this.state.refreshing) {
      return;
    }

    this.setState({refreshing: true});
    this.props.relay.refetch({
      repoId: this.props.repository.id,
      issueishId: this.props.issueish.id,
      timelineCount: 100,
      timelineCursor: null,
      commitCount: 100,
      commitCursor: null,
    }, null, () => {
      this.setState({refreshing: false});
    }, {force: true});
  }
}

export default createRefetchContainer(BarePullRequestDetailView, {
  repository: graphql`
    fragment prDetailView_repository on Repository {
      id
      name
      owner {
        login
      }
    }
  `,

  issueish: graphql`
    fragment prDetailView_issueish on PullRequest
    @argumentDefinitions(
      timelineCount: {type: "Int!"},
      timelineCursor: {type: "String"},
      commitCount: {type: "Int!"},
      commitCursor: {type: "String"},
    ) {
      __typename

      ... on Node {
        id
      }

      ... on PullRequest {
        isCrossRepository
        changedFiles
        ...prCommitsView_pullRequest @arguments(commitCount: $commitCount, commitCursor: $commitCursor)
        countedCommits: commits {
          totalCount
        }
        ...prStatusesView_pullRequest
        state number title bodyHTML baseRefName headRefName
        author {
          login avatarUrl
          ... on User { url }
          ... on Bot { url }
        }

        ...prTimelineController_pullRequest @arguments(timelineCount: $timelineCount, timelineCursor: $timelineCursor)
      }

      ... on UniformResourceLocatable { url }

      ... on Reactable {
        reactionGroups {
          content users { totalCount }
        }
      }
    }
  `,
}, graphql`
  query prDetailViewRefetchQuery
  (
    $repoId: ID!,
    $issueishId: ID!,
    $timelineCount: Int!,
    $timelineCursor: String,
    $commitCount: Int!,
    $commitCursor: String
  ) {
    repository:node(id: $repoId) {
      ...prDetailView_repository @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor
      )
    }

    issueish:node(id: $issueishId) {
      ...prDetailView_issueish @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor,
        commitCount: $commitCount,
        commitCursor: $commitCursor
      )
    }
  }
`);
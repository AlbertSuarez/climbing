# Climbing

[![pages-build-deployment](https://github.com/AlbertSuarez/climbing/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/AlbertSuarez/climbing/actions/workflows/pages/pages-build-deployment)

[![GitHub stars](https://img.shields.io/github/stars/AlbertSuarez/climbing.svg)](https://gitHub.com/AlbertSuarez/climbing/stargazers/)
[![GitHub forks](https://img.shields.io/github/forks/AlbertSuarez/climbing.svg)](https://gitHub.com/AlbertSuarez/climbing/network/)
[![GitHub repo size in bytes](https://img.shields.io/github/repo-size/AlbertSuarez/climbing.svg)](https://github.com/AlbertSuarez/climbing)
[![GitHub contributors](https://img.shields.io/github/contributors/AlbertSuarez/climbing.svg)](https://gitHub.com/AlbertSuarez/climbing/graphs/contributors/)
[![GitHub license](https://img.shields.io/github/license/AlbertSuarez/climbing.svg)](https://github.com/AlbertSuarez/climbing/blob/master/LICENSE)

🧗 Static website to highlight my climbing stats

> [!NOTE]
> **🔗 Live Demo:** [asuarez.dev/climbing](https://asuarez.dev/climbing)

## Summary

This is a simple static and responsive website that highlight my Rock Climbing achievements based on stats.

The raw data is extracted directly from my [TheCrag profile](https://www.thecrag.com/climber/albertsuarez), which is manually updated every back and then and leave it in the [data folder](data/logbook.csv).

The website files are static but the display is dynamic based on the CSV data. It's done in this way because TheCrag terms and conditions don't allow API usage for non-commercial use cases.

## How to update the logbook file

1. Go the [TheCrag Dashboard](https://www.thecrag.com/dashboard) website.
2. Click on the `Action` dropdown buttom from the top left.
3. Click on `Export logbook as CSV`.
4. Leave it in the `data` folder from the repository under the `logbook.csv` name.
5. Commit and push changes.
6. See it live in [asuarez.dev/climbing](https://asuarez.dev/climbing)!

## Fork policy

Pretty simple. Feel free to fork from this repository and update your [logbook.csv](data/logbook.csv) file to get your stats website!

## Authors

- [Albert Suàrez](https://github.com/AlbertSuarez)
